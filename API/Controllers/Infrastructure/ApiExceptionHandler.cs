using API.DTOs.Common;
using API.Services.Common;
using Microsoft.AspNetCore.Diagnostics;

namespace API.Controllers.Infrastructure;

// Turns any exception that escapes a controller into the standard error body (DTOs/Common/ErrorResponse).
// Services only throw AppException; this is the one place that decides what the client receives,
// so no controller needs a try/catch. Registered in Program.cs with AddExceptionHandler and run by
// the UseExceptionHandler middleware.
public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception,
        CancellationToken cancellationToken)
    {
        int status;
        ErrorResponse body;

        if (exception is AppException appException)
        {
            // An expected, documented error: send its status, code, and message as they are.
            status = appException.Status;
            body = new ErrorResponse(appException.Code, appException.Message)
            {
                Extra = appException.Extensions.Count > 0 ? appException.Extensions : null,
            };

            if (status == StatusCodes.Status403Forbidden)
            {
                logger.LogWarning("Forbidden ({Code}) on {Method} {Path}",
                    appException.Code, httpContext.Request.Method, httpContext.Request.Path);
            }
        }
        else
        {
            // A bug or an outage (e.g. database down). Log everything for us; tell the client nothing
            // internal, because exception messages and stack traces can reveal how the server works.
            logger.LogError(exception, "Unhandled exception on {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);
            status = StatusCodes.Status500InternalServerError;
            body = new ErrorResponse("server_error", "Something went wrong. Please try again.");
        }

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(body, cancellationToken);

        // true = handled; the middleware stops here and sends this response.
        return true;
    }
}
