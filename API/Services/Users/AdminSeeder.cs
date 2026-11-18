using API.Data;
using API.Models.Entities;
using API.Models.Enums;
using Microsoft.AspNetCore.Identity;
using MongoDB.Bson;
using MongoDB.Driver;

namespace API.Services.Users;

// Runs once at startup (Program.cs) to make sure the system can be used (research R17):
// 1. an Admin from configuration if none exists, so someone can sign in and manage users;
// 2. in Development only, a sample agent and five help-desk categories, so US1–US3 can be tried
//    before the admin screens (US4) exist. Emails and passwords come from user secrets, never source.
public class AdminSeeder(
    MongoDbContext db,
    PasswordHasher<User> passwordHasher,
    IConfiguration configuration,
    IHostEnvironment environment,
    TimeProvider time,
    ILogger<AdminSeeder> logger)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await SeedAdminAsync(cancellationToken);

        if (environment.IsDevelopment())
        {
            await SeedDevCategoriesAsync(cancellationToken);
        }
    }

    private async Task SeedAdminAsync(CancellationToken cancellationToken)
    {
        if (await db.Users.Find(u => u.Role == UserRole.Admin).AnyAsync(cancellationToken))
        {
            return;
        }

        var email = configuration["Seed:AdminEmail"];
        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("No admin exists and Seed:AdminEmail / Seed:AdminPassword are not set; skipping admin seed");
            return;
        }

        // Display name is optional; "Administrator" if Seed:AdminName is not set.
        var name = configuration["Seed:AdminName"];
        if (string.IsNullOrWhiteSpace(name))
        {
            name = "Administrator";
        }

        var admin = NewUser(name.Trim(), email, UserRole.Admin, password, []);
        await db.Users.InsertOneAsync(admin, cancellationToken: cancellationToken);
        logger.LogInformation("Created the initial admin {UserId}", admin.Id);
    }

    // Sample categories for a help desk. Plain names, not secrets, so they can live in code.
    private static readonly string[] DevCategoryNames =
        ["Technical Support", "Help Desk", "Billing", "Account & Access", "Hardware & Network"];

    // One agent (Seed:DevAgentName, e.g. Basma) who belongs to every sample category and is its
    // default agent. Each category needs a default agent, so the agent is created first with the
    // categories' ids generated up front.
    private async Task SeedDevCategoriesAsync(CancellationToken cancellationToken)
    {
        if (await db.Categories.Find(FilterDefinition<Category>.Empty).AnyAsync(cancellationToken))
        {
            return;
        }

        var name = configuration["Seed:DevAgentName"];
        var email = configuration["Seed:DevAgentEmail"];
        var password = configuration["Seed:DevAgentPassword"];
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email)
            || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Seed:DevAgentName / Seed:DevAgentEmail / Seed:DevAgentPassword are not set; skipping sample data");
            return;
        }

        var categoryIds = DevCategoryNames.Select(_ => ObjectId.GenerateNewId().ToString()).ToList();

        var agentId = await EnsureAgentAsync(name.Trim(), email, password, categoryIds, cancellationToken);
        if (agentId is null)
        {
            return;
        }

        await db.Categories.InsertManyAsync(
            DevCategoryNames.Select((categoryName, i) => NewCategory(categoryIds[i], categoryName, agentId)),
            cancellationToken: cancellationToken);
        logger.LogInformation("Created sample agent {UserId} and {CategoryCount} sample categories",
            agentId, DevCategoryNames.Length);
    }

    // Creates the agent, or reuses an existing agent with that email (e.g. if the categories were
    // deleted by hand but the user was not). Returns null if the email belongs to a non-agent.
    private async Task<string?> EnsureAgentAsync(string name, string email, string password,
        List<string> categoryIds, CancellationToken cancellationToken)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existing = await db.Users.Find(u => u.Email == normalizedEmail).FirstOrDefaultAsync(cancellationToken);

        if (existing is null)
        {
            var agent = NewUser(name, email, UserRole.Agent, password, categoryIds);
            await db.Users.InsertOneAsync(agent, cancellationToken: cancellationToken);
            return agent.Id;
        }

        if (existing.Role != UserRole.Agent)
        {
            logger.LogWarning("Sample agent email belongs to user {UserId}, who is not an agent; skipping sample data",
                existing.Id);
            return null;
        }

        await db.Users.UpdateOneAsync(
            u => u.Id == existing.Id,
            Builders<User>.Update.AddToSetEach(u => u.CategoryIds, categoryIds),
            cancellationToken: cancellationToken);
        return existing.Id;
    }

    // Seeded users can sign in straight away: they get a password and count as verified.
    private User NewUser(string name, string email, UserRole role, string password, List<string> categoryIds)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var user = new User
        {
            Name = name,
            Email = email.Trim().ToLowerInvariant(),
            Role = role,
            CategoryIds = categoryIds,
            EmailVerified = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);
        return user;
    }

    private Category NewCategory(string id, string name, string defaultAgentId)
    {
        var now = time.GetUtcNow().UtcDateTime;
        return new Category
        {
            Id = id,
            Name = name,
            NameNormalized = name.Trim().ToLowerInvariant(),
            DefaultAgentId = defaultAgentId,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }
}
