using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace API.Models.Entities;

// One message in a ticket's conversation. Comments live in their own collection ("ticketComments")
// rather than inside the ticket, so long conversations never make the ticket document large.
// Every comment is visible to the ticket's customer (no internal notes).
public class Comment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.ObjectId)]
    public string TicketId { get; set; } = string.Empty;

    // Only the author's id is stored; their name and role are looked up when the ticket is shown.
    [BsonRepresentation(BsonType.ObjectId)]
    public string AuthorId { get; set; } = string.Empty;

    // Required, 1–5,000 chars.
    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
