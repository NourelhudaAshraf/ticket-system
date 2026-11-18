namespace API.DTOs.Common;

// One page of a list, returned by every list endpoint (constitution Principle III: all lists are
// paginated). T is the row type, e.g. PagedResult<TicketSummaryDto>. The client uses TotalCount
// with PageSize to draw the page numbers. Serialized as { items, page, pageSize, totalCount }.
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, long TotalCount);
