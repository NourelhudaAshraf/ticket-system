namespace API.Services.Settings;

// Settings for sending email over SMTP ("Smtp" configuration section). In development these come
// from user secrets (Gmail: smtp.gmail.com, port 587, an app password) — never from source code.
public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;

    public int Port { get; set; } = 587;

    // true = encrypted from the first byte (usually port 465); false = start plain and upgrade
    // with STARTTLS (port 587, what Gmail expects).
    public bool UseSsl { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;

    public string FromName { get; set; } = string.Empty;
}
