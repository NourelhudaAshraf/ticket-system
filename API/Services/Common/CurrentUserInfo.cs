using API.Models.Enums;

namespace API.Services.Common;

// Who is making the request, as a plain value. Controllers build it from the sign-in cookie's
// claims (Controllers/ClaimsPrincipalExtensions.cs) and pass it to services, so services never
// depend on HttpContext and every permission check reads from one small object.
public record CurrentUserInfo(string UserId, string Name, UserRole Role, IReadOnlyList<string> CategoryIds);
