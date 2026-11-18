using System.ComponentModel.DataAnnotations;
using API.Models.Enums;

namespace API.DTOs.Tickets;

// JSON body for PATCH /tickets/{id}, e.g. { "priority": "High" }. Only the priority can be edited;
// the category changes only through reassignment.
// Nullable so a missing value is a 400 ([Required]) instead of silently becoming Low (the enum's 0).
public record UpdatePriorityRequest([Required] TicketPriority? Priority);
