using System.ComponentModel.DataAnnotations;

namespace API.DTOs.Tickets;

// JSON body for POST /tickets/{id}/assign: the new agent and one of that agent's categories.
// The ticket's category becomes CategoryId (the ticket moves to the area it really belongs to).
public record AssignTicketRequest(
    [Required] string AgentId,
    [Required] string CategoryId);
