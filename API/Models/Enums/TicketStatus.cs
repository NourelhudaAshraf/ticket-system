namespace API.Models.Enums;

// The ticket lifecycle: Open → InProgress → Resolved → Closed, one step forward at a time.
// Which moves are allowed is decided in Helpers/Tickets/TicketRules.cs, not here.
public enum TicketStatus
{
    Open,
    InProgress,
    Resolved,
    Closed
}
