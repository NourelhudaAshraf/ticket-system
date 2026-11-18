namespace API.Services.Settings;

// General app settings ("App" configuration section).
public class AppOptions
{
    public const string SectionName = "App";

    // Address of the React app, used to build links in emails (e.g. {ClientBaseUrl}/tickets/{id}).
    // http://localhost:5173 in Development; the real site address in production.
    public string ClientBaseUrl { get; set; } = string.Empty;
}
