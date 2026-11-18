using API.Data;
using API.DTOs.Auth;
using API.Helpers.Auth;
using API.Models.Entities;
using API.Models.Enums;
using API.Services.Common;
using API.Services.Email;
using Microsoft.AspNetCore.Identity;
using MongoDB.Bson;
using MongoDB.Driver;

namespace API.Services.Auth;

// All account rules in one place: registration, email verification, password check, forgot/reset password.
// The controller only turns the returned User into a cookie; it never checks passwords itself.
// TimeProvider is used instead of DateTime.UtcNow so tests can move the clock (e.g. past a link's expiry).
public class AuthService(
    MongoDbContext db,
    PasswordHasher<User> passwordHasher,
    TimeProvider time,
    EmailService emailService,
    ILogger<AuthService> logger)
{
    private static readonly TimeSpan PasswordResetLifetime = TimeSpan.FromHours(1);
    private static readonly TimeSpan EmailVerificationLifetime = TimeSpan.FromHours(24);

    private DateTime UtcNow => time.GetUtcNow().UtcDateTime;

    // Creates a Customer account (self sign-up never creates agents or admins) and emails a
    // verification link. The user can sign in right away but must verify before submitting tickets.
    public async Task<User> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(request.Email);

        // Quick check for a friendly error; the unique index below is what really guarantees it.
        if (await db.Users.Find(u => u.Email == email).AnyAsync(cancellationToken))
        {
            throw AppException.EmailTaken();
        }

        var token = TokenHelper.GenerateToken();
        var now = UtcNow;
        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            Role = UserRole.Customer,
            EmailVerified = false,
            EmailVerificationTokenHash = TokenHelper.Hash(token),
            EmailVerificationExpiresAt = now + EmailVerificationLifetime,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        try
        {
            await db.Users.InsertOneAsync(user, cancellationToken: cancellationToken);
        }
        // Two sign-ups with the same email at the same moment: both pass the check above, but the
        // unique index on Email lets only one insert through.
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw AppException.EmailTaken();
        }

        await emailService.SendEmailVerificationAsync(user, token);
        return user;
    }

    // Marks the email as verified. The link works once; a wrong, used, or expired link all give the same error.
    public async Task VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default)
    {
        static AppException InvalidLink() =>
            AppException.Validation("token", "This link is invalid or has expired. Request a new one.");

        if (!ObjectId.TryParse(request.UserId, out _))
        {
            throw InvalidLink();
        }

        var user = await db.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync(cancellationToken);
        var now = UtcNow;

        if (user?.EmailVerificationTokenHash is not { } storedHash
            || user.EmailVerificationExpiresAt is not { } expiresAt
            || expiresAt <= now
            || !TokenHelper.Matches(request.Token, storedHash))
        {
            throw InvalidLink();
        }

        // Filtering on the stored hash makes the link single-use even if two requests arrive at once.
        var result = await db.Users.UpdateOneAsync(
            u => u.Id == user.Id && u.EmailVerificationTokenHash == storedHash,
            Builders<User>.Update
                .Set(u => u.EmailVerified, true)
                .Set(u => u.EmailVerificationTokenHash, null)
                .Set(u => u.EmailVerificationExpiresAt, null)
                .Set(u => u.UpdatedAt, now),
            cancellationToken: cancellationToken);

        if (result.ModifiedCount == 0)
        {
            throw InvalidLink();
        }
    }

    // Always succeeds, so it cannot be used to discover accounts. Only unverified users get a new
    // link; the previous link stops working because its hash is replaced.
    public async Task ResendVerificationAsync(ResendVerificationRequest request, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users.Find(u => u.Email == email).FirstOrDefaultAsync(cancellationToken);
        if (user is null || user.EmailVerified)
        {
            return;
        }

        var token = TokenHelper.GenerateToken();
        var now = UtcNow;

        await db.Users.UpdateOneAsync(
            u => u.Id == user.Id,
            Builders<User>.Update
                .Set(u => u.EmailVerificationTokenHash, TokenHelper.Hash(token))
                .Set(u => u.EmailVerificationExpiresAt, now + EmailVerificationLifetime)
                .Set(u => u.UpdatedAt, now),
            cancellationToken: cancellationToken);

        await emailService.SendEmailVerificationAsync(user, token);
    }

    // Returns the signed-in user. Unknown email, wrong password, and "no password set yet" all give the
    // same InvalidCredentials error, so the response never reveals which emails have accounts.
    public async Task<User> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users.Find(u => u.Email == email).FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            logger.LogWarning("Failed sign-in for an email with no account");
            throw AppException.InvalidCredentials();
        }

        var result = user.PasswordHash is null
            ? PasswordVerificationResult.Failed
            : passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);

        if (result == PasswordVerificationResult.Failed)
        {
            logger.LogWarning("Failed sign-in for user {UserId}", user.Id);
            throw AppException.InvalidCredentials();
        }

        // The hash was made with older settings (e.g. fewer PBKDF2 iterations); store a fresh one.
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            await db.Users.UpdateOneAsync(
                u => u.Id == user.Id,
                Builders<User>.Update.Set(u => u.PasswordHash, passwordHasher.HashPassword(user, request.Password)),
                cancellationToken: cancellationToken);
        }

        return user;
    }

    // Always succeeds, whether or not the email has an account, so it cannot be used to discover
    // accounts. Calling it again ("Send again") issues a new link; the previous one stops working.
    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users.Find(u => u.Email == email).FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            return;
        }

        var token = TokenHelper.GenerateToken();
        var now = UtcNow;

        await db.Users.UpdateOneAsync(
            u => u.Id == user.Id,
            Builders<User>.Update
                .Set(u => u.PasswordResetTokenHash, TokenHelper.Hash(token))
                .Set(u => u.PasswordResetExpiresAt, now + PasswordResetLifetime)
                .Set(u => u.UpdatedAt, now),
            cancellationToken: cancellationToken);

        await emailService.SendPasswordResetAsync(user, token);
    }

    // Also accepts admin invitations (same link format, 72 h expiry set by the admin flow).
    // Setting a password proves the user controls the inbox, so the email counts as verified.
    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        // A wrong, used, or expired link all get the same answer.
        static AppException InvalidLink() =>
            AppException.Validation("token", "This link is invalid or has expired. Request a new one.");

        // The id comes from a URL; anything that is not an ObjectId cannot match a user.
        if (!ObjectId.TryParse(request.UserId, out _))
        {
            throw InvalidLink();
        }

        var user = await db.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync(cancellationToken);
        var now = UtcNow;

        if (user?.PasswordResetTokenHash is not { } storedHash
            || user.PasswordResetExpiresAt is not { } expiresAt
            || expiresAt <= now
            || !TokenHelper.Matches(request.Token, storedHash))
        {
            throw InvalidLink();
        }

        // Filtering on the stored hash makes the link single-use even if two requests arrive at once:
        // only the first update matches, the second finds the hash already cleared.
        var result = await db.Users.UpdateOneAsync(
            u => u.Id == user.Id && u.PasswordResetTokenHash == storedHash,
            Builders<User>.Update
                .Set(u => u.PasswordHash, passwordHasher.HashPassword(user, request.NewPassword))
                .Set(u => u.PasswordResetTokenHash, null)
                .Set(u => u.PasswordResetExpiresAt, null)
                .Set(u => u.EmailVerified, true)
                .Set(u => u.EmailVerificationTokenHash, null)
                .Set(u => u.EmailVerificationExpiresAt, null)
                .Set(u => u.UpdatedAt, now),
            cancellationToken: cancellationToken);

        if (result.ModifiedCount == 0)
        {
            throw InvalidLink();
        }
    }

    public async Task<User> GetUserAsync(string id, CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(id, out _))
        {
            throw AppException.NotFound();
        }

        return await db.Users.Find(u => u.Id == id).FirstOrDefaultAsync(cancellationToken)
            ?? throw AppException.NotFound();
    }

    // Emails are stored lower-cased, so lookups must be too ("Ann@X.com" and "ann@x.com" are one account).
    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
