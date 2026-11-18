using API.Data;
using API.DTOs.Comments;
using API.DTOs.Common;
using API.DTOs.Tickets;
using API.Helpers.Tickets;
using API.Models.Entities;
using API.Models.Enums;
using API.Services.Common;
using MongoDB.Bson;
using MongoDB.Driver;

namespace API.Services.Tickets;

// Ticket use cases: create, read, list, comment, status, priority, reassign. Holds the database calls; who may do what
// comes from TicketRules, and the response shapes from TicketMapper.
public class TicketService(
    MongoDbContext db,
    TimeProvider time,
    ILogger<TicketService> logger)
{
    private DateTime UtcNow => time.GetUtcNow().UtcDateTime;

    // A verified customer opens a ticket. It is assigned to the category's default agent right away
    // (FR-017), so every ticket always has an agent.
    public async Task<TicketDetailDto> CreateAsync(CurrentUserInfo user, CreateTicketRequest request,
        CancellationToken cancellationToken = default)
    {
        if (user.Role != UserRole.Customer)
        {
            throw AppException.Forbidden();
        }

        // The cookie does not say whether the email is verified (it can change after sign-in), so read it.
        var customer = await db.Users.Find(u => u.Id == user.UserId).FirstOrDefaultAsync(cancellationToken);
        if (customer is not { EmailVerified: true })
        {
            throw AppException.EmailNotVerified();
        }

        var category = ObjectId.TryParse(request.CategoryId, out _)
            ? await db.Categories.Find(c => c.Id == request.CategoryId && !c.IsDeleted).FirstOrDefaultAsync(cancellationToken)
            : null;
        if (category is null)
        {
            throw AppException.CategoryDeleted();
        }

        var relatedTicketId = string.IsNullOrWhiteSpace(request.RelatedTicketId) ? null : request.RelatedTicketId.Trim();
        if (relatedTicketId is not null)
        {
            var ownsRelated = ObjectId.TryParse(relatedTicketId, out _)
                && await db.Tickets.Find(t => t.Id == relatedTicketId && t.CustomerId == user.UserId)
                    .AnyAsync(cancellationToken);
            if (!ownsRelated)
            {
                throw AppException.Validation("relatedTicketId", "The related ticket must be one of your tickets.");
            }
        }

        var now = UtcNow;
        var ticket = new Ticket
        {
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            CategoryId = category.Id,
            Priority = request.Priority,
            PriorityRank = TicketRules.PriorityRank(request.Priority),
            Status = TicketStatus.Open,
            CustomerId = user.UserId,
            AssignedAgentId = category.DefaultAgentId,
            RelatedTicketId = relatedTicketId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await db.Tickets.InsertOneAsync(ticket, cancellationToken: cancellationToken);

        logger.LogInformation("Ticket {TicketId} created by {UserId}, assigned to {AgentId}",
            ticket.Id, user.UserId, ticket.AssignedAgentId);

        var names = await LoadNamesAsync([ticket], [], cancellationToken);
        return TicketMapper.ToDetail(ticket, [], names, TicketRules.GetPermissions(user, ticket));
    }

    // One ticket with its conversation. A ticket the user may not see gets 404, not 403,
    // so nobody can find out which ticket ids exist.
    public async Task<TicketDetailDto> GetDetailAsync(CurrentUserInfo user, string id,
        CancellationToken cancellationToken = default)
    {
        var ticket = await FindVisibleAsync(user, id, cancellationToken);
        return await BuildDetailAsync(user, ticket, cancellationToken);
    }

    // Moves the ticket one step: Open → InProgress → Resolved → Closed (FR-015). Only the assigned
    // agent or an admin may do it; any other step answers 422 with the allowed next status.
    public async Task<TicketDetailDto> ChangeStatusAsync(CurrentUserInfo user, string id, ChangeStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var ticket = await FindVisibleAsync(user, id, cancellationToken);
        var permissions = TicketRules.GetPermissions(user, ticket);

        if (!permissions.CanChangeStatus)
        {
            throw AppException.Forbidden();
        }

        var status = request.Status!.Value; // [Required] already rejected a missing value
        if (!permissions.AllowedNextStatuses.Contains(status))
        {
            throw AppException.InvalidTransition(permissions.AllowedNextStatuses);
        }

        var update = Builders<Ticket>.Update.Set(t => t.Status, status);
        if (status == TicketStatus.Resolved)
        {
            update = update.Set(t => t.ResolvedAt, UtcNow);
        }
        else if (status == TicketStatus.Closed)
        {
            update = update.Set(t => t.ClosedAt, UtcNow);
        }

        var updated = await UpdateTicketAsync(ticket.Id, update, cancellationToken);
        logger.LogInformation("Ticket {TicketId} status {From} → {To} by {UserId}",
            ticket.Id, ticket.Status, status, user.UserId);

        return await BuildDetailAsync(user, updated, cancellationToken);
    }

    // FR-019: the assigned agent or an admin may change the priority.
    public async Task<TicketDetailDto> UpdatePriorityAsync(CurrentUserInfo user, string id,
        UpdatePriorityRequest request, CancellationToken cancellationToken = default)
    {
        var ticket = await FindVisibleAsync(user, id, cancellationToken);

        if (!TicketRules.GetPermissions(user, ticket).CanEditPriority)
        {
            throw AppException.Forbidden();
        }

        var priority = request.Priority!.Value;
        var updated = await UpdateTicketAsync(
            ticket.Id,
            Builders<Ticket>.Update
                .Set(t => t.Priority, priority)
                .Set(t => t.PriorityRank, TicketRules.PriorityRank(priority)),
            cancellationToken);

        return await BuildDetailAsync(user, updated, cancellationToken);
    }

    // FR-016: hand the ticket to another agent. The new category must be one the new agent belongs
    // to, and the ticket's category follows — so a ticket filed under the wrong area moves to the
    // right one. The caller may lose access afterwards (Permissions.CanView = false in the answer).
    public async Task<TicketDetailDto> AssignAsync(CurrentUserInfo user, string id, AssignTicketRequest request,
        CancellationToken cancellationToken = default)
    {
        var ticket = await FindVisibleAsync(user, id, cancellationToken);

        if (!TicketRules.GetPermissions(user, ticket).CanReassign)
        {
            throw AppException.Forbidden();
        }

        var categoryExists = ObjectId.TryParse(request.CategoryId, out _)
            && await db.Categories.Find(c => c.Id == request.CategoryId && !c.IsDeleted).AnyAsync(cancellationToken);
        if (!categoryExists)
        {
            throw AppException.CategoryDeleted();
        }

        var agentEligible = ObjectId.TryParse(request.AgentId, out _)
            && await db.Users
                .Find(u => u.Id == request.AgentId && u.Role == UserRole.Agent && u.CategoryIds.Contains(request.CategoryId))
                .AnyAsync(cancellationToken);
        if (!agentEligible)
        {
            throw AppException.AgentNotEligible();
        }

        var updated = await UpdateTicketAsync(
            ticket.Id,
            Builders<Ticket>.Update
                .Set(t => t.AssignedAgentId, request.AgentId)
                .Set(t => t.CategoryId, request.CategoryId),
            cancellationToken);

        logger.LogInformation("Ticket {TicketId} reassigned to {AgentId} in category {CategoryId} by {UserId}",
            ticket.Id, request.AgentId, request.CategoryId, user.UserId);

        return await BuildDetailAsync(user, updated, cancellationToken);
    }

    // A page of tickets. Every query starts from TicketRules.VisibilityFilter and only adds to it,
    // so no filter combination can return another customer's ticket.
    public async Task<PagedResult<TicketSummaryDto>> ListAsync(CurrentUserInfo user, TicketListQuery query,
        CancellationToken cancellationToken = default)
    {
        var f = Builders<Ticket>.Filter;
        var filters = new List<FilterDefinition<Ticket>>
        {
            TicketRules.VisibilityFilter(user),
            ScopeFilter(user, query),
        };

        if (query.Status.Count > 0)
        {
            filters.Add(f.In(t => t.Status, query.Status));
        }

        if (query.Priority.Count > 0)
        {
            filters.Add(f.In(t => t.Priority, query.Priority));
        }

        if (query.CreatedFrom is { } from)
        {
            filters.Add(f.Gte(t => t.CreatedAt, AsUtc(from)));
        }

        // A date with no time means "that whole day", so the upper bound is the start of the next day.
        if (query.CreatedTo is { } to)
        {
            var end = to.TimeOfDay == TimeSpan.Zero ? AsUtc(to).AddDays(1) : AsUtc(to).AddTicks(1);
            filters.Add(f.Lt(t => t.CreatedAt, end));
        }

        var q = query.Q?.Trim();
        if (!string.IsNullOrEmpty(q))
        {
            // A pasted ticket id finds that ticket; anything else searches title and description.
            filters.Add(q.Length == 24 && ObjectId.TryParse(q, out _) ? f.Eq(t => t.Id, q) : f.Text(q));
        }

        var filter = f.And(filters);

        var s = Builders<Ticket>.Sort;
        var ascending = query.Dir == "asc";
        // Priority is stored as text, so sort by the numeric rank. Id breaks ties so pages never overlap.
        SortDefinition<Ticket> sort = query.Sort switch
        {
            "updatedAt" => ascending ? s.Ascending(t => t.UpdatedAt) : s.Descending(t => t.UpdatedAt),
            "priority" => ascending ? s.Ascending(t => t.PriorityRank) : s.Descending(t => t.PriorityRank),
            _ => ascending ? s.Ascending(t => t.CreatedAt) : s.Descending(t => t.CreatedAt),
        };
        sort = ascending ? s.Combine(sort, s.Ascending(t => t.Id)) : s.Combine(sort, s.Descending(t => t.Id));

        var totalCount = await db.Tickets.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var tickets = await db.Tickets
            .Find(filter)
            .Sort(sort)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        var names = await LoadNamesAsync(tickets, [], cancellationToken);
        var items = tickets.Select(t => TicketMapper.ToSummary(t, names)).ToList();

        return new PagedResult<TicketSummaryDto>(items, query.Page, query.PageSize, totalCount);
    }

    // Adds a message to the conversation. Resolved and Closed tickets are read-only (FR-018).
    public async Task<CommentDto> AddCommentAsync(CurrentUserInfo user, string id, AddCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        var ticket = await FindVisibleAsync(user, id, cancellationToken);

        if (!TicketRules.CanComment(ticket.Status))
        {
            throw AppException.TicketReadOnly();
        }

        // e.g. an agent who sees the ticket through a category but is not assigned to it.
        if (!TicketRules.GetPermissions(user, ticket).CanComment)
        {
            throw AppException.Forbidden();
        }

        var now = UtcNow;
        var comment = new Comment
        {
            TicketId = ticket.Id,
            AuthorId = user.UserId,
            Body = request.Body.Trim(),
            CreatedAt = now,
        };

        await db.Comments.InsertOneAsync(comment, cancellationToken: cancellationToken);

        // A new message counts as activity, so the ticket moves up in "recently updated" lists.
        await db.Tickets.UpdateOneAsync(
            t => t.Id == ticket.Id,
            Builders<Ticket>.Update.Set(t => t.UpdatedAt, now),
            cancellationToken: cancellationToken);

        var names = await LoadNamesAsync([], [comment], cancellationToken);
        return TicketMapper.ToComment(comment, names);
    }

    // Every ticket change goes through here: one update by id that also bumps UpdatedAt, returning the
    // ticket as saved. No version check — if two people save at once, the last save wins.
    private async Task<Ticket> UpdateTicketAsync(string id, UpdateDefinition<Ticket> update,
        CancellationToken cancellationToken)
    {
        return await db.Tickets.FindOneAndUpdateAsync(
                t => t.Id == id,
                update.Set(t => t.UpdatedAt, UtcNow),
                new FindOneAndUpdateOptions<Ticket> { ReturnDocument = ReturnDocument.After },
                cancellationToken)
            ?? throw AppException.NotFound();
    }

    // The detail response: the ticket, its conversation oldest first, names, and what this user may do.
    private async Task<TicketDetailDto> BuildDetailAsync(CurrentUserInfo user, Ticket ticket,
        CancellationToken cancellationToken)
    {
        var comments = await db.Comments
            .Find(c => c.TicketId == ticket.Id)
            .SortBy(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        var names = await LoadNamesAsync([ticket], comments, cancellationToken);
        return TicketMapper.ToDetail(ticket, comments, names, TicketRules.GetPermissions(user, ticket));
    }

    // The ticket if it exists AND the user may see it; otherwise 404 either way.
    private async Task<Ticket> FindVisibleAsync(CurrentUserInfo user, string id, CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            throw AppException.NotFound();
        }

        var filter = Builders<Ticket>.Filter.And(
            Builders<Ticket>.Filter.Eq(t => t.Id, id),
            TicketRules.VisibilityFilter(user));

        return await db.Tickets.Find(filter).FirstOrDefaultAsync(cancellationToken)
            ?? throw AppException.NotFound();
    }

    // Like Mongoose's populate: collect every user and category id the tickets and comments refer to,
    // then load them with one query per collection instead of one query per row.
    private async Task<NameLookup> LoadNamesAsync(IReadOnlyCollection<Ticket> tickets,
        IReadOnlyCollection<Comment> comments, CancellationToken cancellationToken)
    {
        var userIds = tickets
            .SelectMany(t => new[] { t.CustomerId, t.AssignedAgentId })
            .Concat(comments.Select(c => c.AuthorId))
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToList();
        var categoryIds = tickets.Select(t => t.CategoryId).Distinct().ToList();

        // Only the fields we need, so password and token hashes are never read.
        var users = userIds.Count == 0
            ? []
            : await db.Users
                .Find(Builders<User>.Filter.In(u => u.Id, userIds))
                .Project(u => new { u.Id, u.Name, u.Role })
                .ToListAsync(cancellationToken);

        // Deleted categories are included on purpose: old tickets still show their category's name.
        var categories = categoryIds.Count == 0
            ? []
            : await db.Categories
                .Find(Builders<Category>.Filter.In(c => c.Id, categoryIds))
                .Project(c => new { c.Id, c.Name })
                .ToListAsync(cancellationToken);

        return new NameLookup(
            users.ToDictionary(u => u.Id, u => new NameLookup.UserName(u.Name, u.Role)),
            categories.ToDictionary(c => c.Id, c => c.Name));
    }

    // Which scopes each role may use (contracts/rest-api.md); any other combination is 403.
    // Each scope only narrows the visibility filter, never widens it.
    private static FilterDefinition<Ticket> ScopeFilter(CurrentUserInfo user, TicketListQuery query)
    {
        var f = Builders<Ticket>.Filter;
        var scope = query.Scope ?? DefaultScope(user.Role);

        return (scope, user.Role) switch
        {
            // VisibilityFilter already limits a customer to their own tickets.
            ("mine", UserRole.Customer) => f.Empty,

            // The agent's queue: only tickets assigned to them (from any category).
            ("assigned", UserRole.Agent) => f.Eq(t => t.AssignedAgentId, user.UserId),

            // Tickets in the agent's categories, whoever they are assigned to (read-only unless
            // assigned to this agent).
            ("category", UserRole.Agent) => AgentCategoryFilter(user, query.CategoryId),

            // Admins see every ticket; categoryId (optional) narrows to one category, deleted ones included.
            ("all", UserRole.Admin) => string.IsNullOrEmpty(query.CategoryId)
                ? f.Empty
                : f.Eq(t => t.CategoryId, query.CategoryId),

            _ => throw AppException.Forbidden(),
        };
    }

    // One category if given (it must be one of the agent's), otherwise all of the agent's categories.
    private static FilterDefinition<Ticket> AgentCategoryFilter(CurrentUserInfo user, string? categoryId)
    {
        var f = Builders<Ticket>.Filter;

        if (string.IsNullOrEmpty(categoryId))
        {
            return f.In(t => t.CategoryId, user.CategoryIds);
        }

        return user.CategoryIds.Contains(categoryId)
            ? f.Eq(t => t.CategoryId, categoryId)
            : throw AppException.Forbidden();
    }

    private static string DefaultScope(UserRole role) => role switch
    {
        UserRole.Customer => "mine",
        UserRole.Agent => "assigned",
        _ => "all",
    };

    // Query-string dates arrive without a time zone; treat them as UTC like everything stored.
    private static DateTime AsUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
