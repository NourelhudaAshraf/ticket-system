using System.Text.Json;
using System.Text.Json.Serialization;
using API.Controllers.Infrastructure;
using API.Data;
using API.DTOs.Common;
using API.Models.Entities;
using API.Models.Enums;
using API.Services.Auth;
using API.Services.Categories;
using API.Services.Dashboard;
using API.Services.Email;
using API.Services.Settings;
using API.Services.Tickets;
using API.Services.Users;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

// Program.cs builds the app in two halves, like an Express app.js:
// 1. builder.Services — register everything the app can use (the dependency-injection container);
// 2. app.Use... — the request pipeline: middleware that every request passes through, in order.
//----------------

// Must run before any MongoDB collection is touched, so every class is mapped with the same rules.
MongoDbContext.RegisterConventions();

// Loads appsettings.json, appsettings.{Environment}.json, user secrets (Development).
var builder = WebApplication.CreateBuilder(args);

// ---------- Logging ----------
// Clear the default providers (console, debug, event source) and add a single JSON console logger.
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options => options.IncludeScopes = true);

// ---------- Settings (options pattern) ----------
// Each class is filled from its configuration section.
builder.Services.Configure<MongoOptions>(builder.Configuration.GetSection(MongoOptions.SectionName));
builder.Services.Configure<AppOptions>(builder.Configuration.GetSection(AppOptions.SectionName));
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));

// ---------- Services (dependency injection) ----------
// Singleton = one instance for the whole app. Scoped = a new instance per HTTP request.
// MongoClient keeps a connection pool, so it and MongoDbContext must be singletons.
//sp -> service provider 
builder.Services.AddSingleton<IMongoClient>(sp =>
    new MongoClient(sp.GetRequiredService<IOptions<MongoOptions>>().Value.ConnectionString));
builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<PasswordHasher<User>>();

builder.Services.AddScoped<DatabaseInitializer>();
//depends on interface instead of concrete class, so that we can change provider (outlook) if needed
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<TicketService>();
builder.Services.AddScoped<AdminSeeder>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<DashboardService>();

// ---------- Sign-in (cookie authentication) ----------
// After sign-in the browser keeps an HttpOnly cookie
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "ts_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        
        //By default, ASP.NET handles an anonymous user by redirecting to /Account/Login
        //it is api so we want to return 401/403 instead of redirecting to a login page
        options.Events.OnRedirectToLogin = context =>
            WriteErrorAsync(context.HttpContext, StatusCodes.Status401Unauthorized,
                "unauthenticated", "Please sign in.");
        options.Events.OnRedirectToAccessDenied = context =>
            WriteErrorAsync(context.HttpContext, StatusCodes.Status403Forbidden,
                "forbidden", "You are not allowed to do this.");
    });

// ---------- Permissions (authorization policies) ----------
// Controllers use [Authorize(Policy = "Admin")] etc. The fallback policy applies to every endpoint
// without its own attribute: signed-in users only, so forgetting [Authorize] never opens an endpoint.
// Public endpoints opt out with [AllowAnonymous].
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(nameof(UserRole.Customer), policy => policy.RequireRole(nameof(UserRole.Customer)))
    .AddPolicy(nameof(UserRole.Agent), policy => policy.RequireRole(nameof(UserRole.Agent)))
    .AddPolicy(nameof(UserRole.Admin), policy => policy.RequireRole(nameof(UserRole.Admin)))
    .AddPolicy("AgentOrAdmin", policy => policy.RequireRole(nameof(UserRole.Agent), nameof(UserRole.Admin)))
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

// ---------- Controllers and JSON ----------
builder.Services.AddControllers()
    // camelCase is the default; enums as text ("InProgress", not 1).
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
    // Replace its default body with ours: { code, message, errors: { field: [messages] } }.
    .ConfigureApiBehaviorOptions(options => options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(entry => entry.Value is { Errors.Count: > 0 })
            .ToDictionary(
                entry => JsonNamingPolicy.CamelCase.ConvertName(entry.Key),
                entry => entry.Value!.Errors
                    .Select(e => string.IsNullOrEmpty(e.ErrorMessage) ? "Invalid value." : e.ErrorMessage)
                    .ToArray());

        return new BadRequestObjectResult(new ErrorResponse("validation_failed", "Some fields are invalid.")
        {
            Extra = new Dictionary<string, object?> { ["errors"] = errors },
        });
    });

// Same enum-as-text rule for JSON written outside controllers (exception handler, cookie events).
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddOpenApi();

// ---------- Errors ----------
// ApiExceptionHandler writes the body. AddProblemDetails is only here because UseExceptionHandler()
// without a path refuses to start without it.
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

// ---------- Startup work ----------
// Scoped services need a scope outside a request, so create one just for startup.
// we do this as there is no request yet, so we create a scope to get the services we need for initialization
// db initialization and seeding is done here, so that we can ensure the database is ready before handling requests
using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<DatabaseInitializer>().InitializeAsync();
    await scope.ServiceProvider.GetRequiredService<AdminSeeder>().SeedAsync();
}

// ---------- Request pipeline (order matters, like app.use in Express) ----------
// 1. Exception handler first, so it catches errors thrown by everything after it.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    // The OpenAPI document at /openapi/v1.json; public so tools can read it without signing in.
    app.MapOpenApi().AllowAnonymous();
    // A web page at /swagger that reads that document and lets you try every endpoint (like
    // swagger-ui-express). Calls from the page share the browser's cookie, so sign in with
    // POST /auth/login there first and the protected endpoints work too.
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "Ticket System API v1"));
}

// 2. Send http:// requests to https://.
app.UseHttpsRedirection();
// 3. Read the ts_auth cookie and set User (who is calling)...
app.UseAuthentication();
// 4. ...then check the endpoint's policy against that user.
app.UseAuthorization();
// 5. Finally run the matching controller action.
app.MapControllers();

app.Run();

// Writes the standard { code, message } error body for the cookie 401/403 answers above.
static Task WriteErrorAsync(HttpContext httpContext, int status, string code, string message)
{
    httpContext.Response.StatusCode = status;
    return httpContext.Response.WriteAsJsonAsync(new ErrorResponse(code, message));
}
