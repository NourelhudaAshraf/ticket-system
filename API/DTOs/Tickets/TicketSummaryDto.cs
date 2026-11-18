using API.Models.Enums;

namespace API.DTOs.Tickets;

// One row in a ticket list (customer list, agent queue, admin tickets). Kept small on purpose:
// no description or comments. Names are looked up by id when the list is built.
public record TicketSummaryDto(
    string Id,
    string Title,
    TicketStatus Status,
    TicketPriority Priority,
    string CategoryId,
    string CategoryName,
    string CustomerName,
    string AssignedAgentId,
    string AssignedAgentName,
    DateTime CreatedAt,
    DateTime UpdatedAt);
