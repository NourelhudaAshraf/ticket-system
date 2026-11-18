using API.DTOs.Tickets;
using API.Models.Entities;
using API.Models.Enums;
using API.Services.Common;
using MongoDB.Driver;

namespace API.Helpers.Tickets;

// The single source of truth for who may see and do what on a ticket (constitution Principle II),
// implementing data-model.md "Ticket lifecycle" and "Who can do what on a ticket". Every ticket
// action checks GetPermissions, and every ticket list or search starts from VisibilityFilter.
// Static and free of database calls (those live in Services/), so the rules are easy to read and
// to unit test; TicketService loads the data and asks these helpers for the answer.
public static class TicketRules
{
    // One step forward at a time: Open → InProgress → Resolved → Closed. Closing is always a manual
    // action, and a Closed ticket has no next status, so tickets are never reopened (FR-015).
    public static IReadOnlyList<TicketStatus> AllowedNext(TicketStatus status) => status switch
    {
        TicketStatus.Open => [TicketStatus.InProgress],
        TicketStatus.InProgress => [TicketStatus.Resolved],
        TicketStatus.Resolved => [TicketStatus.Closed],
        _ => [],
    };

    // 1 = Low … 4 = Urgent. Stored next to the text priority so "sort by priority" sorts by importance.
    public static int PriorityRank(TicketPriority priority) => (int)priority + 1;

    // Resolved and Closed tickets are read-only for conversation (FR-012, FR-018).
    public static bool CanComment(TicketStatus status) =>
        status is TicketStatus.Open or TicketStatus.InProgress;

    // The MongoDB filter for "tickets this user may see". List and search queries combine their own
    // filters with this one (And), never replace it, so no query can return someone else's ticket.
    public static FilterDefinition<Ticket> VisibilityFilter(CurrentUserInfo user)
    {
        var filter = Builders<Ticket>.Filter;

        return user.Role switch
        {
            UserRole.Customer => filter.Eq(t => t.CustomerId, user.UserId),
            // A ticket reassigned to an agent outside their categories must still reach them.
            UserRole.Agent => filter.Or(
                filter.In(t => t.CategoryId, user.CategoryIds),
                filter.Eq(t => t.AssignedAgentId, user.UserId)),
            UserRole.Admin => filter.Empty,
            _ => throw new ArgumentOutOfRangeException(nameof(user), user.Role, "Unknown role."),
        };
    }

    // Same rule as VisibilityFilter, for one ticket already loaded in memory.
    public static bool CanView(CurrentUserInfo user, Ticket ticket) => user.Role switch
    {
        UserRole.Customer => ticket.CustomerId == user.UserId,
        UserRole.Agent => user.CategoryIds.Contains(ticket.CategoryId) || ticket.AssignedAgentId == user.UserId,
        UserRole.Admin => true,
        _ => false,
    };

    // Everything the user may do on this ticket. The server checks these flags before each action,
    // and the same object is sent to the client to decide which buttons to show.
    public static TicketPermissionsDto GetPermissions(CurrentUserInfo user, Ticket ticket)
    {
        if (!CanView(user, ticket))
        {
            return new TicketPermissionsDto(false, false, false, [], false, false);
        }

        // Agents act only on tickets assigned to them; seeing a ticket through a category is read-only.
        var canManage = user.Role == UserRole.Admin
            || (user.Role == UserRole.Agent && ticket.AssignedAgentId == user.UserId);

        // A customer who can view the ticket owns it, so owners may comment too.
        var canComment = (canManage || user.Role == UserRole.Customer) && CanComment(ticket.Status);

        return new TicketPermissionsDto(
            CanView: true,
            CanComment: canComment,
            CanChangeStatus: canManage,
            AllowedNextStatuses: canManage ? AllowedNext(ticket.Status) : [],
            CanEditPriority: canManage,
            CanReassign: canManage);
    }
}
