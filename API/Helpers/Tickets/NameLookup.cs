using API.Models.Enums;

namespace API.Helpers.Tickets;

// Documents store only ids, so TicketService loads the referenced names in one query per collection
// (like Mongoose's populate) and passes them to TicketMapper in this object.
public record NameLookup(
    IReadOnlyDictionary<string, NameLookup.UserName> Users,
    IReadOnlyDictionary<string, string> Categories)
{
    public record UserName(string Name, UserRole Role);

    // Users are never deleted, so a missing id means bad data; show a placeholder instead of failing.
    public UserName User(string id) =>
        Users.GetValueOrDefault(id) ?? new UserName("Unknown user", UserRole.Customer);

    public string Category(string id) => Categories.GetValueOrDefault(id) ?? "Unknown category";
}
