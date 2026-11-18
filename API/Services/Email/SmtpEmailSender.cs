using API.Services.Settings;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace API.Services.Email;

// Sends email over SMTP with MailKit (Microsoft recommends it over the old System.Net.Mail client).
// Each call opens a connection, sends one message, and closes it — simple, and fine for one email
// per user action.
public class SmtpEmailSender(IOptions<SmtpOptions> options) : IEmailSender
{
    public async Task SendAsync(string to, string subject, string textBody, string htmlBody,
        CancellationToken cancellationToken = default)
    {
        var smtp = options.Value;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(smtp.FromName, smtp.FromAddress));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;

        // Multipart: mail apps that show HTML use HtmlBody, plain-text ones fall back to TextBody.
        message.Body = new BodyBuilder { TextBody = textBody, HtmlBody = htmlBody }.ToMessageBody();

        // Gmail on port 587 requires STARTTLS: connect in plain text, then upgrade to encryption.
        var security = smtp.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;

        // "using" disposes the client (closing the network socket) even if sending throws.
        using var client = new SmtpClient();
        await client.ConnectAsync(smtp.Host, smtp.Port, security, cancellationToken);
        await client.AuthenticateAsync(smtp.UserName, smtp.Password, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(quit: true, cancellationToken);
    }
}
