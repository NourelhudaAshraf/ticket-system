using System.Security.Claims;
using API.Models.Enums;
using API.Services.Common;

namespace API.Controllers.Infrastructure;

// Turns the signed-in user's cookie claims (the controller's `User`, like `req.user` in Express)
// into the plain CurrentUserInfo record that services take. Written as an extension method, so a
// controller can call `User.ToCurrentUser()` as if ClaimsPrincipal had that method built in.
public static class ClaimsPrincipalExtensions
{
    // Claim type for an agent's categories; AuthController adds one claim per category at sign-in.
    public const string CategoryClaimType = "category";

    // "this ClaimsPrincipal user" is what makes it an extension method: `User.ToCurrentUser()`
    // is just a nicer way to write `ClaimsPrincipalExtensions.ToCurrentUser(User)`.
    public static CurrentUserInfo ToCurrentUser(this ClaimsPrincipal user)
    {
        // Controllers require sign-in by default (fallback policy), so these claims are always there;
        // a missing one means a bug in sign-in, not bad user input.
        string Required(string claimType) =>
            user.FindFirstValue(claimType)
            ?? throw new InvalidOperationException($"Signed-in user has no '{claimType}' claim.");

        return new CurrentUserInfo(
            UserId: Required(ClaimTypes.NameIdentifier),
            Name: Required(ClaimTypes.Name),
            Role: Enum.Parse<UserRole>(Required(ClaimTypes.Role)),
            CategoryIds: user.FindAll(CategoryClaimType).Select(c => c.Value).ToList());
    }
}
