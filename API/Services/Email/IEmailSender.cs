namespace API.Services.Email;

// "Something that can send an email." EmailService depends on this interface, not on MailKit or
// Gmail, so the delivery method can change by swapping one class in Program.cs.
// Implementations throw on failure; EmailService catches and logs it so the user's action still
// succeeds (the user can ask for account emails again).
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string textBody, string htmlBody,
        CancellationToken cancellationToken = default);
}
