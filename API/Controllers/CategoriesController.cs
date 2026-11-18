using API.Controllers.Infrastructure;
using API.DTOs.Categories;
using API.Services.Categories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// Category endpoints under /api/v1/categories. Any signed-in user may list categories (customers need
// them for the new-ticket form); CategoryService decides how much each role sees. Get, create, edit,
// and delete are admin-only: [Authorize] on an action adds to the fallback "signed in" rule.
[ApiController]
[Route("api/v1/categories")]
public class CategoriesController(CategoryService categoryService) : ControllerBase
{
    // Non-deleted categories sorted by name. Customers get only id and name; agents and admins also
    // get the default agent and the number of agents.
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> List(CancellationToken cancellationToken)
    {
        var categories = await categoryService.ListAsync(User.ToCurrentUser(), cancellationToken);
        return Ok(categories);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<CategoryDto>> Get(string id, CancellationToken cancellationToken)
    {
        return Ok(await categoryService.GetAsync(id, cancellationToken));
    }

    // { name, defaultAgentId } → 201 with a Location header pointing at GET /categories/{id}.
    [HttpPost]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<CategoryDto>> Create(CategoryRequest request, CancellationToken cancellationToken)
    {
        var category = await categoryService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = category.Id }, category);
    }

    // Rename and/or change the default agent.
    [HttpPut("{id}")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<CategoryDto>> Update(string id, CategoryRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await categoryService.UpdateAsync(id, request, cancellationToken));
    }

    // Soft delete; 204 No Content (nothing to send back).
    [HttpDelete("{id}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await categoryService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
