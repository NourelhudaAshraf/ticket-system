using API.Models.Entities;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;

namespace API.Data;

// The one place that knows the database and collection names. Services receive this class
// through dependency injection and use its typed collections. Registered as a singleton:
// MongoClient keeps a connection pool, so one instance is shared by the whole app.
public class MongoDbContext
{
    private static bool _conventionsRegistered;

    public MongoDbContext(IMongoClient client, IOptions<MongoOptions> options)
    {
        var database = client.GetDatabase(options.Value.Database);

        Users = database.GetCollection<User>("users");
        Categories = database.GetCollection<Category>("categories");
        Tickets = database.GetCollection<Ticket>("tickets");
        Comments = database.GetCollection<Comment>("ticketComments");
    }

    public IMongoCollection<User> Users { get; }
    public IMongoCollection<Category> Categories { get; }
    public IMongoCollection<Ticket> Tickets { get; }
    public IMongoCollection<Comment> Comments { get; }

    // Conventions tell the driver how to map every class without per-property attributes:
    // camelCase field names (Name → "name"), enums saved as text ("Admin", not 2), and unknown
    // fields ignored so an older app version can still read newer documents.
    // Must run once at startup, before the first collection is used (Program.cs calls it first).
    public static void RegisterConventions()
    {
        if (_conventionsRegistered)
        {
            return;
        }

        var pack = new ConventionPack
        {
            new CamelCaseElementNameConvention(),
            new EnumRepresentationConvention(BsonType.String),
            new IgnoreExtraElementsConvention(true),
        };
        ConventionRegistry.Register("TicketSystem", pack, _ => true);

        _conventionsRegistered = true;
    }
}
