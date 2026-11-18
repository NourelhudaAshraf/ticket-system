using API.Models.Entities;
using API.Models.Enums;

namespace API.DTOs.Users;

// What the API returns for a user (sign-in, /me, admin user screens). Lists only safe fields:
// the password hash and token hashes on User never leave the server.
public record UserDto(
    string Id,
    string Name,
    string Email,
    UserRole Role,
    IReadOnlyList<string> CategoryIds,
    bool EmailVerified)
{
    // One place that maps the stored document to the response, so every endpoint sends the same shape.
    public static UserDto From(User user) =>
        new(user.Id, user.Name, user.Email, user.Role, user.CategoryIds, user.EmailVerified);
}
