using System.Security.Claims;
using API.Controllers.Infrastructure;
using API.DTOs.Auth;
using API.DTOs.Users;
using API.Models.Entities;
using API.Services.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// Sign-in endpoints under /api/v1/auth. Thin on purpose: each action calls AuthService (which holds
// every rule) and only deals with HTTP — the cookie, the status code, and the response body.
// [ApiController] checks the request DTO's data annotations first and answers 400 on its own.
[ApiController]
[Route("api/v1/auth")]
public class AuthController(AuthService authService) : ControllerBase
{
    // Creates a Customer account and emails a verification link. Does not sign the user in;
    // the client sends them to the login page next.
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var user = await authService.RegisterAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, UserDto.From(user));
    }

    // Called by the page the emailed link opens. 400 validation_failed if the link is wrong, used, or expired.
    [AllowAnonymous]
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequest request, CancellationToken cancellationToken)
    {
        await authService.VerifyEmailAsync(request, cancellationToken);
        return NoContent();
    }

    // Always 202 Accepted, whether or not the email exists, so this cannot be used to find accounts.
    [AllowAnonymous]
    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification(ResendVerificationRequest request, CancellationToken cancellationToken)
    {
        await authService.ResendVerificationAsync(request, cancellationToken);
        return Accepted();
    }

    // Checks email + password, then writes the ts_auth cookie. Every later request sends that cookie
    // back automatically, and ASP.NET reads it into `User` (see ClaimsPrincipalExtensions).
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await authService.LoginAsync(request, cancellationToken);

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, BuildPrincipal(user));

        return Ok(UserDto.From(user));
    }

    // Deletes the cookie; the browser is signed out.
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    // Who am I? Read fresh from the database (not just the cookie), so the client sees the latest
    // name, role, and verification state. The React app calls this on start to restore the session.
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me(CancellationToken cancellationToken)
    {
        var user = await authService.GetUserAsync(User.ToCurrentUser().UserId, cancellationToken);
        return Ok(UserDto.From(user));
    }

    // Always 202 Accepted, whether or not the email exists, so this cannot be used to find accounts.
    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        await authService.ForgotPasswordAsync(request, cancellationToken);
        return Accepted();
    }

    // Also used to accept an admin invitation (the invited user sets their first password here).
    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await authService.ResetPasswordAsync(request, cancellationToken);
        return NoContent();
    }

    // The facts stored inside the cookie (claims), like a JWT payload: id, name, role, and one
    // "category" claim per agent category. ClaimsPrincipalExtensions.ToCurrentUser reads them back.
    private static ClaimsPrincipal BuildPrincipal(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role.ToString()),
        };
        // claims do not support arrays so we can have same type multiple times
        claims.AddRange(user.CategoryIds.Select(id => new Claim(ClaimsPrincipalExtensions.CategoryClaimType, id)));

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }
}
