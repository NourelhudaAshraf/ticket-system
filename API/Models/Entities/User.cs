using API.Models.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace API.Models.Entities;

// A person who can sign in: customer, agent, or admin. One document per user in the "users"
// collection. Users are never deactivated or deleted (spec FR-025). Input rules (lengths, email
// format) are checked on the request DTOs and in services; this class only describes stored data.
public class User
{
    // [BsonId] marks the document's _id. BsonRepresentation(ObjectId) lets C# use a plain string
    // while MongoDB stores a real ObjectId; the driver generates it on insert when Id is empty.
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    // Required, 1–100 chars.
    public string Name { get; set; } = string.Empty;

    // Stored lower-cased; unique (enforced by a unique index in Data/DatabaseInitializer.cs).
    public string Email { get; set; } = string.Empty;

    // Null until an invited user sets a password. Only a salted hash is stored, never the password.
    public string? PasswordHash { get; set; }

    public UserRole Role { get; set; }

    // Agents only (zero or more); MUST be empty for Customer and Admin. Each entry is a category's
    // ObjectId, stored as ObjectId in MongoDB but handled as strings in C#.
    [BsonRepresentation(BsonType.ObjectId)]
    public List<string> CategoryIds { get; set; } = [];

    // Customers must verify their email before submitting tickets (FR-002); invited users are
    // verified when they set their password.
    public bool EmailVerified { get; set; }

    // Emailed links carry a random token; only its SHA-256 hash is stored here. Single-use.
    public string? EmailVerificationTokenHash { get; set; }
    public DateTime? EmailVerificationExpiresAt { get; set; }   // 24 h

    public string? PasswordResetTokenHash { get; set; }
    public DateTime? PasswordResetExpiresAt { get; set; }       // 1 h for reset, 72 h for invitation

    // All timestamps are UTC.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
