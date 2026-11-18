using API.Data;
using API.DTOs.Categories;
using API.Models.Entities;
using API.Models.Enums;
using API.Services.Common;
using MongoDB.Bson;
using MongoDB.Driver;

namespace API.Services.Categories;

// Category reads and admin create/edit/delete. Agent membership lives on the user
// (User.CategoryIds), so agent names and counts are looked up from users, not stored on categories.
// Rule kept here: every category has a default agent who is an Agent and belongs to the category.
public class CategoryService(
    MongoDbContext db,
    TimeProvider time,
    ILogger<CategoryService> logger)
{
    private DateTime UtcNow => time.GetUtcNow().UtcDateTime;

    // Non-deleted categories, sorted by name. Customers only need id and name to pick a category for
    // a new ticket, so the agent fields are left null for them.
    public async Task<IReadOnlyList<CategoryDto>> ListAsync(CurrentUserInfo user,
        CancellationToken cancellationToken = default)
    {
        var categories = await db.Categories
            .Find(c => !c.IsDeleted)
            .SortBy(c => c.NameNormalized)
            .ToListAsync(cancellationToken);

        if (user.Role == UserRole.Customer)
        {
            return categories.Select(c => new CategoryDto(c.Id, c.Name, null, null, null)).ToList();
        }

        return await ToDtosAsync(categories, cancellationToken);
    }

    // One category (admin edit dialog). Deleted categories are treated as missing.
    public async Task<CategoryDto> GetAsync(string id, CancellationToken cancellationToken = default)
    {
        var category = await FindAsync(id, cancellationToken);
        return (await ToDtosAsync([category], cancellationToken))[0];
    }

    public async Task<CategoryDto> CreateAsync(CategoryRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        var normalized = Normalize(name);
        await EnsureAgentAsync(request.DefaultAgentId, cancellationToken);
        await EnsureNameFreeAsync(normalized, null, cancellationToken);

        var now = UtcNow;
        var category = new Category
        {
            Name = name,
            NameNormalized = normalized,
            DefaultAgentId = request.DefaultAgentId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        try
        {
            await db.Categories.InsertOneAsync(category, cancellationToken: cancellationToken);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // Two admins saved the same name at the same moment; the unique index caught it.
            throw AppException.NameTaken();
        }

        await AddAgentToCategoryAsync(category.DefaultAgentId, category.Id, cancellationToken);
        logger.LogInformation("Category {CategoryId} created", category.Id);
        return await GetAsync(category.Id, cancellationToken);
    }

    // Rename and/or change the default agent. The old default agent stays in the category; the admin
    // can remove them from it on the Users page afterwards.
    public async Task<CategoryDto> UpdateAsync(string id, CategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        var category = await FindAsync(id, cancellationToken);
        var name = request.Name.Trim();
        var normalized = Normalize(name);
        await EnsureAgentAsync(request.DefaultAgentId, cancellationToken);
        await EnsureNameFreeAsync(normalized, category.Id, cancellationToken);

        try
        {
            await db.Categories.UpdateOneAsync(
                c => c.Id == category.Id,
                Builders<Category>.Update
                    .Set(c => c.Name, name)
                    .Set(c => c.NameNormalized, normalized)
                    .Set(c => c.DefaultAgentId, request.DefaultAgentId)
                    .Set(c => c.UpdatedAt, UtcNow),
                cancellationToken: cancellationToken);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw AppException.NameTaken();
        }

        await AddAgentToCategoryAsync(request.DefaultAgentId, category.Id, cancellationToken);
        logger.LogInformation("Category {CategoryId} updated", category.Id);
        return await GetAsync(category.Id, cancellationToken);
    }

    // Soft delete: the document stays (tickets look its name up by id), but it is hidden everywhere.
    // It is also removed from every agent's CategoryIds, so it no longer shows on their profile and
    // the category no longer grants them access to its tickets. Tickets keep their assigned agent.
    public async Task DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var category = await FindAsync(id, cancellationToken);

        await db.Categories.UpdateOneAsync(
            c => c.Id == category.Id,
            Builders<Category>.Update
                .Set(c => c.IsDeleted, true)
                .Set(c => c.UpdatedAt, UtcNow),
            cancellationToken: cancellationToken);

        // $pull removes the id from the array in every user document that has it.
        await db.Users.UpdateManyAsync(
            Builders<User>.Filter.AnyEq(u => u.CategoryIds, category.Id),
            Builders<User>.Update.Pull(u => u.CategoryIds, category.Id),
            cancellationToken: cancellationToken);

        logger.LogInformation("Category {CategoryId} deleted", category.Id);
    }

    private async Task<Category> FindAsync(string id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            throw AppException.NotFound();
        }

        return await db.Categories.Find(c => c.Id == id && !c.IsDeleted).FirstOrDefaultAsync(cancellationToken)
            ?? throw AppException.NotFound();
    }

    private static string Normalize(string name) => name.Trim().ToLowerInvariant();

    // Deleted categories count too: they keep their name, so a new category can't reuse it.
    private async Task EnsureNameFreeAsync(string normalized, string? exceptId, CancellationToken cancellationToken)
    {
        var taken = await db.Categories
            .Find(c => c.NameNormalized == normalized && c.Id != exceptId)
            .AnyAsync(cancellationToken);
        if (taken)
        {
            throw AppException.NameTaken();
        }
    }

    // The default agent must be an existing user with the Agent role.
    private async Task EnsureAgentAsync(string userId, CancellationToken cancellationToken)
    {
        var isAgent = ObjectId.TryParse(userId, out _)
            && await db.Users.Find(u => u.Id == userId && u.Role == UserRole.Agent).AnyAsync(cancellationToken);
        if (!isAgent)
        {
            throw AppException.AgentNotEligible();
        }
    }

    // Choosing a default agent adds them to the category. $addToSet only adds the id if it isn't
    // already in the array, so saving twice never creates a duplicate.
    private async Task AddAgentToCategoryAsync(string agentId, string categoryId, CancellationToken cancellationToken)
    {
        await db.Users.UpdateOneAsync(
            u => u.Id == agentId,
            Builders<User>.Update
                .AddToSet(u => u.CategoryIds, categoryId)
                .Set(u => u.UpdatedAt, UtcNow),
            cancellationToken: cancellationToken);
    }

    // Adds the default agent's name and the number of agents. One query loads every agent in any of
    // the categories; a default agent always belongs to their category, so their name is in that list.
    private async Task<IReadOnlyList<CategoryDto>> ToDtosAsync(IReadOnlyList<Category> categories,
        CancellationToken cancellationToken)
    {
        var categoryIds = categories.Select(c => c.Id).ToList();
        var agents = await db.Users
            .Find(Builders<User>.Filter.And(
                Builders<User>.Filter.Eq(u => u.Role, UserRole.Agent),
                Builders<User>.Filter.AnyIn(u => u.CategoryIds, categoryIds)))
            .Project(u => new { u.Id, u.Name, u.CategoryIds })
            .ToListAsync(cancellationToken);

        var agentNames = agents.ToDictionary(a => a.Id, a => a.Name);

        return categories
            .Select(c => new CategoryDto(
                c.Id,
                c.Name,
                c.DefaultAgentId,
                agentNames.GetValueOrDefault(c.DefaultAgentId),
                agents.Count(a => a.CategoryIds.Contains(c.Id))))
            .ToList();
    }
}
