using API.DTOs.Comments;
using API.DTOs.Tickets;
using API.Models.Entities;

namespace API.Helpers.Tickets;

// Turns stored documents into API responses. Kept out of TicketService so the service reads as
// rules and database calls only. Names come from a NameLookup the service has already loaded.
public static class TicketMapper
{
    public static TicketSummaryDto ToSummary(Ticket ticket, NameLookup names) =>
        new(
            ticket.Id,
            ticket.Title,
            ticket.Status,
            ticket.Priority,
            ticket.CategoryId,
            names.Category(ticket.CategoryId),
            names.User(ticket.CustomerId).Name,
            ticket.AssignedAgentId,
            names.User(ticket.AssignedAgentId).Name,
            ticket.CreatedAt,
            ticket.UpdatedAt);

    public static TicketDetailDto ToDetail(Ticket ticket, IEnumerable<Comment> comments, NameLookup names,
        TicketPermissionsDto permissions) =>
        new(
            ticket.Id,
            ticket.Title,
            ticket.Status,
            ticket.Priority,
            ticket.CategoryId,
            names.Category(ticket.CategoryId),
            names.User(ticket.CustomerId).Name,
            ticket.AssignedAgentId,
            names.User(ticket.AssignedAgentId).Name,
            ticket.CreatedAt,
            ticket.UpdatedAt,
            ticket.Description,
            ticket.RelatedTicketId,
            comments.Select(c => ToComment(c, names)).ToList(),
            ticket.ResolvedAt,
            ticket.ClosedAt,
            permissions);

    public static CommentDto ToComment(Comment comment, NameLookup names)
    {
        var author = names.User(comment.AuthorId);
        return new CommentDto(comment.Id, comment.AuthorId, author.Name, author.Role, comment.Body, comment.CreatedAt);
    }
}
