using API.Models.Enums;

namespace API.Services.Common;

// The single error type services throw. It carries the HTTP status and a stable "code" from
// contracts/rest-api.md; Controllers/Infrastructure/ApiExceptionHandler turns it into { code, message }.
// Services never build HTTP responses themselves — they throw, and one handler formats every error.
public class AppException(int status, string code, string message, IDictionary<string, object?>? extensions = null)
    : Exception(message)
{
    public int Status { get; } = status;

    // Machine-readable error code the React client switches on, e.g. "email_taken".
    public string Code { get; } = code;

    // Extra fields added to the error body next to code and message, e.g. "allowedNext" or field "errors".
    public IDictionary<string, object?> Extensions { get; } = extensions ?? new Dictionary<string, object?>();

    // Factory methods: services write `throw AppException.NotFound()` instead of repeating status
    // codes and strings, so every use of an error looks the same.

    public static AppException Forbidden() =>
        new(StatusCodes.Status403Forbidden, "forbidden", "You are not allowed to do this.");

    public static AppException EmailNotVerified() =>
        new(StatusCodes.Status403Forbidden, "email_not_verified", "Verify your email address first.");

    // Also used for records that exist but are not visible to the caller, so their existence is hidden.
    public static AppException NotFound() =>
        new(StatusCodes.Status404NotFound, "not_found", "The requested item was not found.");

    public static AppException EmailTaken() =>
        new(StatusCodes.Status409Conflict, "email_taken", "An account with this email already exists.");

    public static AppException NameTaken() =>
        new(StatusCodes.Status409Conflict, "name_taken", "A category with this name already exists.");

    public static AppException InvalidTransition(IEnumerable<TicketStatus> allowedNext) =>
        new(StatusCodes.Status422UnprocessableEntity, "invalid_transition", "This status change is not allowed.",
            // As text ("Resolved"), so the JSON matches how enums appear everywhere else in the API.
            new Dictionary<string, object?> { ["allowedNext"] = allowedNext.Select(s => s.ToString()).ToList() });

    public static AppException TicketReadOnly() =>
        new(StatusCodes.Status422UnprocessableEntity, "ticket_read_only",
            "Resolved and closed tickets cannot be commented on.");

    public static AppException CategoryDeleted() =>
        new(StatusCodes.Status422UnprocessableEntity, "category_deleted", "This category is no longer available.");

    public static AppException AgentNotEligible() =>
        new(StatusCodes.Status422UnprocessableEntity, "agent_not_eligible",
            "The selected user is not an agent of this category.");

    public static AppException AgentIsDefault() =>
        new(StatusCodes.Status422UnprocessableEntity, "agent_is_default",
            "This agent is a category's default agent; choose another default agent first.");

    public static AppException InvalidCredentials() =>
        new(StatusCodes.Status401Unauthorized, "invalid_credentials", "Email or password is incorrect.");

    // A business-rule problem with one input field. Uses the same shape as automatic data-annotation
    // errors ({ errors: { field: [messages] } }), so the client shows both the same way.
    public static AppException Validation(string field, string message) =>
        new(StatusCodes.Status400BadRequest, "validation_failed", message,
            new Dictionary<string, object?> { ["errors"] = new Dictionary<string, string[]> { [field] = [message] } });
}
