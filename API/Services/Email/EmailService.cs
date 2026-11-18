using System.Net;
using API.Models.Entities;
using API.Services.Settings;
using Microsoft.Extensions.Options;

namespace API.Services.Email;

// Writes every email the app sends (subject, plain text, HTML) and hands it to IEmailSender.
// Emails go out right after the change is saved. A failed send is logged and swallowed: the user's
// action already succeeded, and they can ask for the email again (FR-024).
public class EmailService(IEmailSender sender, IOptions<AppOptions> options, ILogger<EmailService> logger)
{
    public Task SendEmailVerificationAsync(User user, string token) =>
        SendLinkEmailAsync(user, "EmailVerification",
            subject: "Verify your email address",
            intro: "Confirm your email address to start submitting support tickets.",
            link: BuildLink("verify-email", user.Id, token),
            buttonText: "Verify email",
            note: "This link is valid for 24 hours. If you did not create an account, you can ignore this email.");

    public Task SendPasswordResetAsync(User user, string token) =>
        SendLinkEmailAsync(user, "PasswordReset",
            subject: "Reset your password",
            intro: "We received a request to reset your password.",
            link: BuildLink("reset-password", user.Id, token),
            buttonText: "Choose a new password",
            note: "This link is valid for 1 hour. If you did not ask for this, you can ignore this email.");

    // Invitations reuse the reset-password page: the invited user picks their first password there.
    public Task SendInvitationAsync(User user, string token) =>
        SendLinkEmailAsync(user, "Invitation",
            subject: "You have been invited to the Support Ticket System",
            intro: $"An administrator created a {user.Role} account for you. Choose a password to sign in.",
            link: BuildLink("reset-password", user.Id, token),
            buttonText: "Set your password",
            note: "This link is valid for 72 hours.");

    // Links point at the React app, which reads userId and token from the query string and calls the API.
    private string BuildLink(string page, string userId, string token) =>
        $"{options.Value.ClientBaseUrl.TrimEnd('/')}/{page}" +
        $"?userId={Uri.EscapeDataString(userId)}&token={Uri.EscapeDataString(token)}";

    // The three account emails share one layout: greeting, one sentence, a link, and a note.
    private Task SendLinkEmailAsync(User user, string emailType, string subject, string intro,
        string link, string buttonText, string note)
    {
        var text = $"Hi {user.Name},\n\n{intro}\n\n{buttonText}: {link}\n\n{note}";

        // HtmlEncode stops a name like "<script>" from becoming markup inside the email.
        var html = $"""
            <p>Hi {WebUtility.HtmlEncode(user.Name)},</p>
            <p>{WebUtility.HtmlEncode(intro)}</p>
            <p><a href="{WebUtility.HtmlEncode(link)}">{WebUtility.HtmlEncode(buttonText)}</a></p>
            <p style="color:#666">{WebUtility.HtmlEncode(note)}</p>
            """;

        return TrySendAsync(user, emailType, subject, text, html);
    }

    // No CancellationToken on purpose: the change is already saved, so the email should still go out
    // even if the browser disconnects. The log has the recipient id and email type, never the body,
    // which contains a token that would let anyone reading the logs use the link.
    private async Task TrySendAsync(User recipient, string emailType, string subject, string textBody, string htmlBody)
    {
        try
        {
            await sender.SendAsync(recipient.Email, subject, textBody, htmlBody);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Could not send {EmailType} email to user {UserId}", emailType, recipient.Id);
        }
    }
}
