using API.Controllers.Infrastructure;
using API.DTOs.Common;
using API.DTOs.Users;
using API.Services.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// Admin user management under /api/v1/admin/users. Admins only. There is no DELETE: users are
// never deleted or deactivated (FR-025).
[ApiController]
[Route("api/v1/admin/users")]
[Authorize(Policy = "Admin")]
public class AdminUsersController(UserService userService) : ControllerBase
{
    // ?role=Customer|Agent|Admin&q=ann&page=1&pageSize=20
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserDto>>> List([FromQuery] UserListQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await userService.ListAsync(query, cancellationToken));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> Get(string id, CancellationToken cancellationToken)
    {
        return Ok(await userService.GetAsync(id, cancellationToken));
    }

    // Invites a user; they choose their password from the emailed link.
    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await userService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UserDto>> Update(string id, UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await userService.UpdateAsync(User.ToCurrentUser(), id, request, cancellationToken));
    }
}
