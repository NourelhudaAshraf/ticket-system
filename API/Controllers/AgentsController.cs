using API.DTOs.Users;
using API.Services.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// GET /api/v1/agents — agents with their categories, for the reassign and default-agent pickers.
// Agents and admins only (customers never pick agents).
[ApiController]
[Route("api/v1/agents")]
[Authorize(Policy = "AgentOrAdmin")]
public class AgentsController(UserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AgentDto>>> List([FromQuery] string? categoryId,
        CancellationToken cancellationToken)
    {
        return Ok(await userService.ListAgentsAsync(categoryId, cancellationToken));
    }
}
