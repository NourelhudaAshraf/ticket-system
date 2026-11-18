using System.ComponentModel.DataAnnotations;
using API.Models.Enums;

namespace API.DTOs.Tickets;

// The query string for GET /tickets, e.g. ?scope=mine&status=Open&status=InProgress&page=2.
// [FromQuery] fills these properties (like req.query in Express, but typed and validated).
// Which scopes each role may use is a business rule, checked in TicketService.
public class TicketListQuery
{
    // mine | assigned | category | all. Null = the role's default (Customer mine, Agent assigned, Admin all).
    [RegularExpression("^(mine|assigned|category|all)$",
        ErrorMessage = "Scope must be mine, assigned, category, or all.")]
    public string? Scope { get; set; }

    // With scope=category: one of the agent's categories; omitted = all of them.
    // With scope=all (Admin): optional filter to one category.
    public string? CategoryId { get; set; }

    // Repeatable: ?status=Open&status=Resolved. Empty = any.
    public List<TicketStatus> Status { get; set; } = [];
    public List<TicketPriority> Priority { get; set; } = [];

    // Dashboard drill-down by creation date.
    public DateTime? CreatedFrom { get; set; }
    public DateTime? CreatedTo { get; set; }

    // A 24-character ticket id → exact match; anything else → text search on title + description.
    [StringLength(100)]
    public string? Q { get; set; }

    [RegularExpression("^(createdAt|updatedAt|priority)$",
        ErrorMessage = "Sort must be createdAt, updatedAt, or priority.")]
    public string Sort { get; set; } = "createdAt";

    [RegularExpression("^(asc|desc)$", ErrorMessage = "Dir must be asc or desc.")]
    public string Dir { get; set; } = "desc";

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
