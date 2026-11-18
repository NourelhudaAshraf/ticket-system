using API.Models.Entities;
using MongoDB.Bson;
using MongoDB.Driver;

namespace API.Data;

// Creates every index from data-model.md when the app starts. CreateMany is idempotent: an index
// that already exists with the same definition is left alone, so running this on every start is
// safe and keeps every environment (your Atlas cluster, production) identical.
// cancellationToken is passed to allow graceful shutdown if the app is stopped (ctrl+C) while creating indexes.
public class DatabaseInitializer(MongoDbContext db)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        // users: sign-in looks up by email (unique), admin lists filter by role, pickers by category.
        var userKeys = Builders<User>.IndexKeys;
        await db.Users.Indexes.CreateManyAsync(
        [
            new CreateIndexModel<User>(userKeys.Ascending(u => u.Email), new CreateIndexOptions { Unique = true }),
            new CreateIndexModel<User>(userKeys.Ascending(u => u.Role)),
            new CreateIndexModel<User>(userKeys.Ascending(u => u.CategoryIds)),
        ], cancellationToken);

        // categories: names are unique ignoring case and spaces (deleted ones keep their name).
        await db.Categories.Indexes.CreateOneAsync(
            new CreateIndexModel<Category>(
                Builders<Category>.IndexKeys.Ascending(c => c.NameNormalized),
                new CreateIndexOptions { Unique = true }),
            cancellationToken: cancellationToken);

        // tickets: one index per list screen, matching its filter and sort order.
        var ticketKeys = Builders<Ticket>.IndexKeys;
        await db.Tickets.Indexes.CreateManyAsync(
        [
            // Customer "My tickets", newest activity first. (customerId + updatedAt)
            new CreateIndexModel<Ticket>(ticketKeys.Ascending(t => t.CustomerId).Descending(t => t.UpdatedAt)),
            // Agent queue: filter by agent and status, sort by priority then date.
            new CreateIndexModel<Ticket>(ticketKeys
                .Ascending(t => t.AssignedAgentId)
                .Ascending(t => t.Status)
                .Descending(t => t.PriorityRank)
                .Descending(t => t.CreatedAt)),
            // Agent category view.
            new CreateIndexModel<Ticket>(ticketKeys
                .Ascending(t => t.CategoryId)
                .Ascending(t => t.Status)
                .Descending(t => t.CreatedAt)),
            // Dashboard date range.
            new CreateIndexModel<Ticket>(ticketKeys.Ascending(t => t.CreatedAt)),
            // Keyword search; a match in the title counts three times as much as in the description.
            // Weights purpose:
            // If searches "payment" and title contains "payment" and description contains "payment"
            // Title gets 3 points, description gets 1 point, so title is more relevant
            new CreateIndexModel<Ticket>(
                ticketKeys.Text(t => t.Title).Text(t => t.Description),
                new CreateIndexOptions { Weights = new BsonDocument { { "title", 3 }, { "description", 1 } } }),
        ], cancellationToken);

        // ticketComments: load one ticket's conversation in order.
        await db.Comments.Indexes.CreateOneAsync(
            new CreateIndexModel<Comment>(
                Builders<Comment>.IndexKeys.Ascending(c => c.TicketId).Ascending(c => c.CreatedAt)),
            cancellationToken: cancellationToken);
    }
}
