using System.ComponentModel.DataAnnotations;
using API.Models.Enums;

namespace API.DTOs.Tickets;

// JSON body for POST /tickets. [ApiController] checks the attributes and answers 400 on its own.
public record CreateTicketRequest(
    [Required, StringLength(150, MinimumLength = 1)] string Title,
    [Required, StringLength(5000, MinimumLength = 1)] string Description,
    // Must exist and not be deleted; checked in TicketService.
    [Required] string CategoryId,
    // Optional; left out = Medium.
    TicketPriority Priority = TicketPriority.Medium,
    // Optional follow-up; must be another ticket of the same customer (checked in TicketService).
    string? RelatedTicketId = null);
