using API.Models.Enums;

namespace API.DTOs.Tickets;

// What the current user may do on one ticket, computed by TicketRules.GetPermissions. The server
// checks these flags before every action, and the same object is sent inside TicketDetailDto so
// the client shows only the buttons that will work. One rule set, so the two can't disagree.
public record TicketPermissionsDto(
    bool CanView,
    bool CanComment,
    bool CanChangeStatus,
    IReadOnlyList<TicketStatus> AllowedNextStatuses,
    bool CanEditPriority,
    bool CanReassign);
