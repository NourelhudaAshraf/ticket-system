using API.Models.Enums;

namespace API.DTOs.Dashboard;

// GET /admin/dashboard response: { total, byStatus: { Open: 3, InProgress: 1, ... }, byPriority: { Low: 0, ... } }.
// Dictionaries keyed by the enums serialize with the enum names as keys ("InProgress"), which are
// exactly the values the client sends back as ?status= / ?priority= when drilling down. Every
// status and priority is always present (0 when there are no tickets).
// TotalAgents / TotalCustomers count users by role; they ignore the ticket date range.
public record DashboardDto(
    long Total,
    IReadOnlyDictionary<TicketStatus, long> ByStatus,
    IReadOnlyDictionary<TicketPriority, long> ByPriority,
    long TotalAgents,
    long TotalCustomers);
