using API.Controllers.Infrastructure;
using API.DTOs.Comments;
using API.DTOs.Common;
using API.DTOs.Tickets;
using API.Services.Tickets;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// Ticket endpoints under /api/v1/tickets. Thin on purpose: each action reads the request, calls
// TicketService (which checks who may do what), and picks the status code. Any signed-in user may
// call these (fallback policy); the service answers 403/404 per ticket.
[ApiController]
[Route("api/v1/tickets")]
public class TicketsController(TicketService ticketService) : ControllerBase
{
    // GET /api/v1/tickets?scope=mine&status=Open&page=1 — [FromQuery] fills TicketListQuery from the
    // query string, like req.query in Express but typed and validated.
    [HttpGet]
    public async Task<ActionResult<PagedResult<TicketSummaryDto>>> List([FromQuery] TicketListQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await ticketService.ListAsync(User.ToCurrentUser(), query, cancellationToken));
    }

    // JSON body. Answers 201 with a Location header pointing at GET /api/v1/tickets/{id}.
    [HttpPost]
    public async Task<ActionResult<TicketDetailDto>> Create(CreateTicketRequest request,
        CancellationToken cancellationToken)
    {
        var ticket = await ticketService.CreateAsync(User.ToCurrentUser(), request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = ticket.Id }, ticket);
    }

    // 404 both when the ticket doesn't exist and when the user may not see it.
    [HttpGet("{id}")]
    public async Task<ActionResult<TicketDetailDto>> Get(string id, CancellationToken cancellationToken)
    {
        return Ok(await ticketService.GetDetailAsync(User.ToCurrentUser(), id, cancellationToken));
    }

    // { "status": "InProgress" }. 422 invalid_transition (with allowedNext) for a step that isn't next.
    [HttpPost("{id}/status")]
    public async Task<ActionResult<TicketDetailDto>> ChangeStatus(string id, ChangeStatusRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await ticketService.ChangeStatusAsync(User.ToCurrentUser(), id, request, cancellationToken));
    }

    // { "priority": "High" }. PATCH = change part of the ticket (only the priority is editable).
    [HttpPatch("{id}")]
    public async Task<ActionResult<TicketDetailDto>> UpdatePriority(string id, UpdatePriorityRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await ticketService.UpdatePriorityAsync(User.ToCurrentUser(), id, request, cancellationToken));
    }

    // { "agentId": "...", "categoryId": "..." } — the ticket moves to that agent and category.
    [HttpPost("{id}/assign")]
    public async Task<ActionResult<TicketDetailDto>> Assign(string id, AssignTicketRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await ticketService.AssignAsync(User.ToCurrentUser(), id, request, cancellationToken));
    }

    [HttpPost("{id}/comments")]
    public async Task<ActionResult<CommentDto>> AddComment(string id, AddCommentRequest request,
        CancellationToken cancellationToken)
    {
        var comment = await ticketService.AddCommentAsync(User.ToCurrentUser(), id, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, comment);
    }
}
