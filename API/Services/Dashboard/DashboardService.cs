using API.Data;
using API.DTOs.Dashboard;
using API.Models.Entities;
using API.Models.Enums;
using MongoDB.Driver;

namespace API.Services.Dashboard;

// Ticket counts for the admin dashboard (US5). One aggregation = one database round trip, and the
// counts are exact (SC-008), not estimates.
public class DashboardService(MongoDbContext db)
{
    // createdFrom / createdTo use the same rule as the ticket list (TicketService.ListAsync), so a card's
    // number always matches the list it links to: a date without a time means "that whole day".
    public async Task<DashboardDto> GetAsync(DateTime? createdFrom, DateTime? createdTo,
        CancellationToken cancellationToken = default)
    {
        var f = Builders<Ticket>.Filter;
        var filter = f.Empty;

        if (createdFrom is { } from)
        {
            filter &= f.Gte(t => t.CreatedAt, AsUtc(from));
        }

        if (createdTo is { } to)
        {
            var end = to.TimeOfDay == TimeSpan.Zero ? AsUtc(to).AddDays(1) : AsUtc(to).AddTicks(1);
            filter &= f.Lt(t => t.CreatedAt, end);
        }

        // An aggregation pipeline is a list of stages the database runs in order (like chaining
        // .filter().reduce() in JS, but on the server):
        //   $match  — keep tickets in the date range;
        //   $facet  — run two sub-pipelines on those same tickets:
        //       byStatus:   $sortByCount on status   → [{ _id: "Open", count: 3 }, ...]
        //       byPriority: $sortByCount on priority → [{ _id: "High", count: 2 }, ...]
        var byStatusFacet = AggregateFacet.Create("byStatus",
            PipelineDefinition<Ticket, AggregateSortByCountResult<TicketStatus>>.Create(
            [
                PipelineStageDefinitionBuilder.SortByCount<Ticket, TicketStatus>(t => t.Status),
            ]));
        var byPriorityFacet = AggregateFacet.Create("byPriority",
            PipelineDefinition<Ticket, AggregateSortByCountResult<TicketPriority>>.Create(
            [
                PipelineStageDefinitionBuilder.SortByCount<Ticket, TicketPriority>(t => t.Priority),
            ]));

        var result = await db.Tickets
            .Aggregate()
            .Match(filter)
            .Facet(byStatusFacet, byPriorityFacet)
            .FirstAsync(cancellationToken);

        var statusCounts = result.Facets.Single(x => x.Name == "byStatus")
            .Output<AggregateSortByCountResult<TicketStatus>>()
            .ToDictionary(x => x.Id, x => x.Count);
        var priorityCounts = result.Facets.Single(x => x.Name == "byPriority")
            .Output<AggregateSortByCountResult<TicketPriority>>()
            .ToDictionary(x => x.Id, x => x.Count);

        // Missing keys mean "no tickets": fill every enum value so the client never checks for undefined.
        var byStatus = Enum.GetValues<TicketStatus>().ToDictionary(s => s, s => statusCounts.GetValueOrDefault(s));
        var byPriority = Enum.GetValues<TicketPriority>().ToDictionary(p => p, p => priorityCounts.GetValueOrDefault(p));

        // People counts: all users with that role (not limited by the date range). The { role: 1 }
        // index on users makes these counts cheap.
        var totalAgents = await db.Users.CountDocumentsAsync(u => u.Role == UserRole.Agent,
            cancellationToken: cancellationToken);
        var totalCustomers = await db.Users.CountDocumentsAsync(u => u.Role == UserRole.Customer,
            cancellationToken: cancellationToken);

        // Every ticket has exactly one status, so the total is the sum of the status counts.
        return new DashboardDto(byStatus.Values.Sum(), byStatus, byPriority, totalAgents, totalCustomers);
    }

    // Query-string dates arrive without a time zone; treat them as UTC like everything stored.
    private static DateTime AsUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
