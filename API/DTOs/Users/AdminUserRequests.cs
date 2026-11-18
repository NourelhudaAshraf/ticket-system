using System.ComponentModel.DataAnnotations;
using API.Models.Enums;

namespace API.DTOs.Users;

// Inputs for admin user management (/api/v1/admin/users).
// Role-dependent rules (only agents have categories, the default-agent rule) are checked in UserService.

// POST: invite a user. They get no password; the invitation email lets them choose one.
public record CreateUserRequest(
    [Required, StringLength(100, MinimumLength = 1)] string Name,
    [Required, EmailAddress] string Email,
    // Nullable so a missing role is a 400 instead of silently becoming Customer (the enum's 0).
    [Required] UserRole? Role,
    IReadOnlyList<string>? CategoryIds);

// PUT: edit name, role, and categories. The email can't be changed.
public record UpdateUserRequest(
    [Required, StringLength(100, MinimumLength = 1)] string Name,
    [Required] UserRole? Role,
    IReadOnlyList<string>? CategoryIds);

// GET query: ?role=Agent&q=ann&page=1&pageSize=20
public class UserListQuery
{
    public UserRole? Role { get; set; }

    // Part of a name or email.
    [StringLength(100)]
    public string? Q { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
