using System.ComponentModel.DataAnnotations;
using API.Models.Enums;

namespace API.DTOs.Tickets;

// JSON body for POST /tickets/{id}/status, e.g. { "status": "InProgress" }.
// Nullable so a missing value is a 400 ([Required]) instead of silently becoming Open (the enum's 0).
public record ChangeStatusRequest([Required] TicketStatus? Status);
