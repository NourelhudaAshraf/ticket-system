using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace API.Models.Entities;

// A ticket category (e.g. Billing, Technical). Drives classification and automatic assignment:
// every new ticket goes to its category's default agent. One document per category in "categories".
public class Category
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Lower-cased trimmed name; unique index, so "Billing" and " billing " cannot both exist.
    public string NameNormalized { get; set; } = string.Empty;

    // Required: an Agent who belongs to this category. Saving a category adds it to that agent's
    // CategoryIds. The agents of a category are the users whose CategoryIds contain this Id.
    [BsonRepresentation(BsonType.ObjectId)]
    public string DefaultAgentId { get; set; } = string.Empty;

    // Soft delete: a deleted category is hidden from every list and picker, but the document stays
    // so existing tickets keep a valid category name.
    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
