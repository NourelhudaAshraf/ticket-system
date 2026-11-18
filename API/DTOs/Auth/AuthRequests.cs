using System.ComponentModel.DataAnnotations;

namespace API.DTOs.Auth;

// Request bodies for the auth endpoints. [ApiController] checks these attributes before the action
// runs and answers 400 on its own, so services receive input that already has the right shape.
// The attributes sit directly on the record parameters: MVC reads them from the constructor
// parameter, and throws at runtime if they are put on the generated property ("[property: ...]").

// Self-service sign-up; always creates a Customer. Same password rule as ResetPasswordRequest.
public record RegisterRequest(
    [Required, StringLength(100, MinimumLength = 1, ErrorMessage = "Name is required, 1–100 characters.")]
    string Name,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8),
        RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$",
            ErrorMessage = "Password must contain at least one letter and one digit.")]
    string Password);

// The two values from the emailed verification link (?userId=...&token=...).
public record VerifyEmailRequest(
    [Required] string UserId,
    [Required] string Token);

// Always answered with 202, whether or not the email exists, so it can't be used to find accounts.
public record ResendVerificationRequest(
    [Required, EmailAddress] string Email);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

// Always answered with 202, whether or not the email exists, so it can't be used to find accounts.
public record ForgotPasswordRequest(
    [Required, EmailAddress] string Email);

// Also used to accept an admin invitation: the invited user picks their first password here.
public record ResetPasswordRequest(
    [Required] string UserId,
    [Required] string Token,
    [Required, MinLength(8),
        RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$",
            ErrorMessage = "Password must contain at least one letter and one digit.")]
    string NewPassword);
