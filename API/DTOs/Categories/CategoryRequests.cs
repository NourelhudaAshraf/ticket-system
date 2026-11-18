using System.ComponentModel.DataAnnotations;

namespace API.DTOs.Categories;

// Input for admin category management: the same shape is used for POST (create) and PUT (rename /
// change default agent). [ApiController] checks these annotations before the action runs, so a missing
// default agent is a 400 validation_failed. "Must be an Agent" needs the database, so CategoryService
// checks that.
public record CategoryRequest(
    [Required, StringLength(60, MinimumLength = 1)] string Name,
    [Required] string DefaultAgentId);
