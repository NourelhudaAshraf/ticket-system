using System.Text.RegularExpressions;
using API.Data;
using API.DTOs.Common;
using API.DTOs.Users;
using API.Helpers.Auth;
using API.Models.Entities;
using API.Models.Enums;
using API.Services.Common;
using API.Services.Email;
using MongoDB.Bson;
using MongoDB.Driver;

namespace API.Services.Users;

// User reads for pickers, and admin user management: list, get, invite, edit. Users are never
// deleted or deactivated (FR-025). The rules that keep "every category has a default agent who
// belongs to it" true are checked here.
public class UserService(
    MongoDbContext db,
    EmailService emailService,
    TimeProvider time,
    ILogger<UserService> logger)
{
    private static readonly TimeSpan InvitationLifetime = TimeSpan.FromHours(72);

    private DateTime UtcNow => time.GetUtcNow().UtcDateTime;

    // All agents sorted by name, each with their non-deleted categories. With categoryId, only the
    // agents of that category. Used by the reassign dialog and the category default-agent picker.
    public async Task<IReadOnlyList<AgentDto>> ListAgentsAsync(string? categoryId = null,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<User>.Filter.Eq(u => u.Role, UserRole.Agent);
        if (!string.IsNullOrEmpty(categoryId))
        {
            filter &= Builders<User>.Filter.AnyEq(u => u.CategoryIds, categoryId);
        }

        var agents = await db.Users
            .Find(filter)
            .SortBy(u => u.Name)
            .Project(u => new { u.Id, u.Name, u.CategoryIds })
            .ToListAsync(cancellationToken);

        // One query for every category any agent is in; deleted ones are left out of the pickers.
        var categoryIds = agents.SelectMany(a => a.CategoryIds).Distinct().ToList();
        var categories = await db.Categories
            .Find(c => categoryIds.Contains(c.Id) && !c.IsDeleted)
            .SortBy(c => c.NameNormalized)
            .Project(c => new { c.Id, c.Name })
            .ToListAsync(cancellationToken);

        return agents
            .Select(a => new AgentDto(
                a.Id,
                a.Name,
                categories
                    .Where(c => a.CategoryIds.Contains(c.Id))
                    .Select(c => new AgentDto.CategoryRef(c.Id, c.Name))
                    .ToList()))
            .ToList();
    }

    // A page of users, sorted by name. Role filter (the admin page's Customers / Agents tabs) and a
    // search on name or email.
    public async Task<PagedResult<UserDto>> ListAsync(UserListQuery query, CancellationToken cancellationToken = default)
    {
        var f = Builders<User>.Filter;
        var filter = f.Empty;

        if (query.Role is { } role)
        {
            filter &= f.Eq(u => u.Role, role);
        }

        var q = query.Q?.Trim();
        if (!string.IsNullOrEmpty(q))
        {
            // Case-insensitive "contains"; Regex.Escape so characters like "+" or "." are matched literally.
            var pattern = new BsonRegularExpression(Regex.Escape(q), "i");
            filter &= f.Or(f.Regex(u => u.Name, pattern), f.Regex(u => u.Email, pattern));
        }

        var totalCount = await db.Users.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var users = await db.Users
            .Find(filter)
            .SortBy(u => u.Name)
            .ThenBy(u => u.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<UserDto>(users.Select(UserDto.From).ToList(), query.Page, query.PageSize, totalCount);
    }

    public async Task<UserDto> GetAsync(string id, CancellationToken cancellationToken = default)
    {
        return UserDto.From(await FindAsync(id, cancellationToken));
    }

    // Invites a user: no password yet, an emailed link (valid 72 h) lets them choose one. If the
    // email never arrives, they can use "Forgot password" to get a new link.
    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        var role = request.Role!.Value;
        var categoryIds = await CheckCategoriesAsync(role, request.CategoryIds, cancellationToken);
        var email = request.Email.Trim().ToLowerInvariant();

        if (await db.Users.Find(u => u.Email == email).AnyAsync(cancellationToken))
        {
            throw AppException.EmailTaken();
        }

        var token = TokenHelper.GenerateToken();
        var now = UtcNow;
        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            Role = role,
            CategoryIds = categoryIds,
            PasswordHash = null,
            // Setting the password through the link proves the inbox, which also verifies the email.
            EmailVerified = false,
            PasswordResetTokenHash = TokenHelper.Hash(token),
            PasswordResetExpiresAt = now + InvitationLifetime,
            CreatedAt = now,
            UpdatedAt = now,
        };

        try
        {
            await db.Users.InsertOneAsync(user, cancellationToken: cancellationToken);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw AppException.EmailTaken();
        }

        logger.LogInformation("User {UserId} invited as {Role}", user.Id, role);
        await emailService.SendInvitationAsync(user, token);
        return UserDto.From(user);
    }

    // Edits name, role, and categories. Guards: an admin can't remove their own Admin role (so there
    // is always someone who can manage users), and a category's default agent can't stop being an
    // agent or leave that category (choose another default agent for the category first).
    public async Task<UserDto> UpdateAsync(CurrentUserInfo admin, string id, UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await FindAsync(id, cancellationToken);
        var role = request.Role!.Value;
        var categoryIds = await CheckCategoriesAsync(role, request.CategoryIds, cancellationToken);

        if (user.Id == admin.UserId && role != UserRole.Admin)
        {
            throw AppException.Validation("role", "You can't remove your own Admin role.");
        }

        var defaultFor = await db.Categories
            .Find(c => c.DefaultAgentId == user.Id && !c.IsDeleted)
            .Project(c => c.Id)
            .ToListAsync(cancellationToken);
        if (defaultFor.Any(categoryId => role != UserRole.Agent || !categoryIds.Contains(categoryId)))
        {
            throw AppException.AgentIsDefault();
        }

        var updated = await db.Users.FindOneAndUpdateAsync(
            u => u.Id == user.Id,
            Builders<User>.Update
                .Set(u => u.Name, request.Name.Trim())
                .Set(u => u.Role, role)
                .Set(u => u.CategoryIds, categoryIds)
                .Set(u => u.UpdatedAt, UtcNow),
            new FindOneAndUpdateOptions<User> { ReturnDocument = ReturnDocument.After },
            cancellationToken);

        logger.LogInformation("User {UserId} updated by {AdminId}: role {Role}", user.Id, admin.UserId, role);
        return UserDto.From(updated);
    }

    private async Task<User> FindAsync(string id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            throw AppException.NotFound();
        }

        return await db.Users.Find(u => u.Id == id).FirstOrDefaultAsync(cancellationToken)
            ?? throw AppException.NotFound();
    }

    // Only agents have categories (zero or more); for customers and admins the list MUST be empty.
    // Every id must be an existing, non-deleted category. Returns the cleaned, de-duplicated list.
    private async Task<List<string>> CheckCategoriesAsync(UserRole role, IReadOnlyList<string>? requested,
        CancellationToken cancellationToken)
    {
        var ids = (requested ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
        {
            return ids;
        }

        if (role != UserRole.Agent)
        {
            throw AppException.Validation("categoryIds", "Only agents can belong to categories.");
        }

        var allValid = ids.All(id => ObjectId.TryParse(id, out _))
            && await db.Categories.CountDocumentsAsync(c => ids.Contains(c.Id) && !c.IsDeleted,
                cancellationToken: cancellationToken) == ids.Count;
        if (!allValid)
        {
            throw AppException.Validation("categoryIds", "One of the selected categories no longer exists.");
        }

        return ids;
    }
}
