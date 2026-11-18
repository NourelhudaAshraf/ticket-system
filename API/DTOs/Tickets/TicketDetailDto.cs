using API.DTOs.Comments;
using API.Models.Enums;

namespace API.DTOs.Tickets;

// Everything the ticket detail page needs in one response: the summary fields, the full text,
// the conversation, and Permissions (which buttons the current user may use).
// The summary fields are repeated rather than nested, so the JSON stays flat like the contract.
public record TicketDetailDto(
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
    DateTime UpdatedAt,
    string Description,
    string? RelatedTicketId,
    IReadOnlyList<CommentDto> Comments,
    DateTime? ResolvedAt,
    DateTime? ClosedAt,
    TicketPermissionsDto Permissions);
