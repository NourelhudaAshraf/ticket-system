using API.Models.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace API.Models.Entities;

// A support request raised by a customer — the central document, one per ticket in "tickets".
// It stores only the ids of related documents (category, customer, agent); services look up
// their names when building responses, so a rename never leaves stale copies behind.
// Tickets are identified by their Id (no separate ticket number).
public class Ticket
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    // Required, 1–150 chars.
    public string Title { get; set; } = string.Empty;

    // Required, 1–5,000 chars.
    public string Description { get; set; } = string.Empty;

    // Required; changes only through reassignment.
    [BsonRepresentation(BsonType.ObjectId)]
    public string CategoryId { get; set; } = string.Empty;

    // Default Medium. PriorityRank (1–4) exists for sorting, because the enum is stored as text.
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public int PriorityRank { get; set; }

    public TicketStatus Status { get; set; } = TicketStatus.Open;

    // The customer who created the ticket.
    [BsonRepresentation(BsonType.ObjectId)]
    public string CustomerId { get; set; } = string.Empty;

    // Always set: the category's default agent on create, then whoever it is reassigned to.
    [BsonRepresentation(BsonType.ObjectId)]
    public string AssignedAgentId { get; set; } = string.Empty;

    // Optional follow-up reference; MUST be a ticket owned by the same customer.
    [BsonRepresentation(BsonType.ObjectId)]
    public string? RelatedTicketId { get; set; }

    // UpdatedAt changes on any comment or field change.
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Set when the ticket enters Resolved / Closed.
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
}
