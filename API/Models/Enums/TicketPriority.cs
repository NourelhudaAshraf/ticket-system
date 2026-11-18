namespace API.Models.Enums;

// Ordered from lowest to highest. Tickets also store a numeric PriorityRank (1–4) because the enum
// is saved as text, and text sorts alphabetically ("High" < "Low"), not by importance.
public enum TicketPriority
{
    Low,
    Medium,
    High,
    Urgent
}
