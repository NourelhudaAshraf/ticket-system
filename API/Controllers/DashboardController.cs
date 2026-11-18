using API.DTOs.Dashboard;
using API.Services.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// GET /api/v1/admin/dashboard?createdFrom=2026-11-01&createdTo=2026-11-30 — ticket counts by status
// and priority. Admins only.
[ApiController]
[Route("api/v1/admin/dashboard")]
[Authorize(Policy = "Admin")]
public class DashboardController(DashboardService dashboardService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get([FromQuery] DateTime? createdFrom, [FromQuery] DateTime? createdTo,
        CancellationToken cancellationToken)
    {
        return Ok(await dashboardService.GetAsync(createdFrom, createdTo, cancellationToken));
    }
}
