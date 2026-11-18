using System.Text.Json.Serialization;

namespace API.DTOs.Common;

// The one error body every endpoint returns: { "code": "not_found", "message": "..." }.
// Message is for people (the client shows it as is); Code is for the client's code to react to a
// specific case without parsing text (e.g. "invalid_transition"). Codes are listed in contracts/rest-api.md.
public record ErrorResponse(string Code, string Message)
{
    // Extra fields some errors carry, written next to code and message rather than nested, e.g.
    // "allowedNext": ["Resolved"] or "errors": { "email": ["Enter a valid email."] }.
    [JsonExtensionData]
    public IDictionary<string, object?>? Extra { get; init; }
}
