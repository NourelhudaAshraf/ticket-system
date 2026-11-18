---

description: "Task list for the Support Ticket System (learning edition: one .NET file per task, single API project)"
---

# Tasks: Support Ticket System

**Input**: Design documents from `/specs/001-support-ticket-system/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/rest-api.md](contracts/rest-api.md), [contracts/ui-routes.md](contracts/ui-routes.md), [quickstart.md](quickstart.md)

**Tests**: None. Automated tests are out of scope for v1 (owner decision). Each story ends with a manual checkpoint from [quickstart.md](quickstart.md).

**Learning mode (constitution Principle V)**: this project is for learning .NET.

- Every **.NET task touches exactly one file** and has a **Why** explaining the file's job and its place in the folder structure.
- Implement .NET tasks **one at a time, in order**. After writing each file, explain it: what it does, the .NET concepts it uses, and how it connects to the files around it.
- Add short comments in .NET code for non-obvious framework concepts. React (`client/`) tasks may group files.

**Organization**: Tasks are grouped by user story so each story can be built and verified on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task). In learning mode, prefer doing them in order anyway.
- **[Story]**: User story from spec.md (US1–US5)

## Path Conventions

- Back end: one project, `API/` (constitution v3.0.0 Principle I), with folders:
  - `API/Controllers/` — HTTP only; calls services; never uses `Data/` directly
  - `API/Models/` — database documents and enums (BSON attributes allowed here)
  - `API/DTOs/` — request/response shapes with data annotations
  - `API/Services/` — every business rule, plus email sending and options classes
  - `API/Data/` — `MongoDbContext`, `MongoOptions`, `DatabaseInitializer`
- Front end: `client/src/` (React 19, JavaScript/JSX, Vite, Tailwind CSS, axios)
- Not used (constitution Principle IV): repositories, Unit of Work, transactions/replica set, outbox, FluentValidation, `Result<T>`, extra projects.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Remove the old placeholders, add packages, start local services, scaffold the client

- [X] T001 Delete `API/Controllers/WeatherForecastController.cs`. **Why:** a `dotnet new` demo controller; real controllers replace it.
- [X] T002 Delete `API/WeatherForecast.cs`. **Why:** the demo model used only by the deleted controller.
- [X] T003 *(File deleted 2026-11-04: not needed.)*
- [X] T004 Edit `TicketSystem.slnx` so it lists only `API/API.csproj`. **Why:** the solution file is the list of projects `dotnet build` loads; the app is now a single project (research R1).
- [X] T005 [P] Delete the folder `Domain/` (contains only `Domain.csproj` and `Class1.cs`). **Why:** models now live in `API/Models/`.
- [X] T006 [P] Delete the folder `Application/` (contains only `Application.csproj` and `Class1.cs`). **Why:** business rules now live in `API/Services/`.
- [X] T007 [P] Delete the folder `Persistence/` (contains only `Persistence.csproj` and `Class1.cs`). **Why:** database access now lives in `API/Data/`.
- [X] T008 Edit `API/API.csproj`: remove the `ProjectReference` to `..\Application\Application.csproj`; add packages `MongoDB.Driver` (3.x) and `MailKit`; run `dotnet build`. (`PasswordHasher<T>` from `Microsoft.Extensions.Identity.Core` is already part of the ASP.NET Core shared framework in .NET 10 — referencing the package triggers warning NU1510, so it is not added.) **Why:** a `.csproj` declares the framework and NuGet packages the project may use. Learn: `PackageReference` and how `dotnet restore` fetches packages.
- [x] T009 [P] Run `dotnet user-secrets init --project API` and set the development secrets: `Mongo:ConnectionString` (MongoDB Atlas `mongodb+srv://…`), `Mongo:Database` (`ticketsystem`), and `Smtp:*` for Gmail (`Host` `smtp.gmail.com`, `Port` `587`, `UseSsl` `false`, `UserName`/`FromAddress` the Gmail address, `Password` a Gmail app password, `FromName`). **Why:** development uses a hosted database (Atlas) and a real mailbox (Gmail) instead of local containers; user secrets live outside the repo, like a gitignored `.env` in Node, and override `appsettings.Development.json`.
- [X] T010 [P] Scaffold the client with `npm create vite@latest client -- --template react` (JavaScript); install `react-router`, `axios`, `react-hook-form`, `tailwindcss`, `@tailwindcss/vite`; in `client/vite.config.js` add the Tailwind plugin and a dev proxy forwarding `/api` to the API's HTTPS URL from `API/Properties/launchSettings.json` (`secure: false`); replace `client/src/index.css` with `@import "tailwindcss";` plus an `@theme` block setting `--default-border-width`, `--default-outline-width`, `--default-ring-width` to `0.0625rem` (covers border, divide, outline, ring) and a base rule for `hr`; pin `tailwindcss` and `@tailwindcss/vite` to `4.3.3` (4.3.4 depends on an unpublished `@tailwindcss/node`); remove the Vite demo content (it uses `px`) in `client/src/App.jsx`, `client/src/App.css`, `client/src/assets/`, and `client/src/index.css`
- [X] T011 [P] Create `client/eslint.config.js` (the current Vite template ships oxlint instead, so replace it with ESLint + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`); create `client/scripts/check-no-px.js` (Node script that scans `client/src/**` and `client/index.html` for a number followed by `px`, e.g. `16px` or `w-[300px]`, prints file:line for each hit, and exits 1) and make the `lint` script in `client/package.json` run `eslint . && node scripts/check-no-px.js`; confirm `npm run lint` and `npm run build` pass
- [X] T012 [P] Edit `API/appsettings.json` to add sections (no secrets): `Mongo` (`ConnectionString`, `Database`), `Smtp` (`Host`, `Port`, `UseSsl`, `UserName`, `Password`, `FromAddress`, `FromName`), `App` (`ClientBaseUrl`), `Seed` (`AdminName`, `AdminEmail`, `AdminPassword`, `DevAgentName`, `DevAgentEmail`, `DevAgentPassword` empty). **Why:** .NET configuration merges JSON files, environment variables, and user secrets into one tree; this file holds defaults shared by every environment.
- [X] T013 [P] Edit `API/appsettings.Development.json`: `ClientBaseUrl` `http://localhost:5173` only — Mongo and SMTP values come from user secrets (T009). **Why:** values here override `appsettings.json` only when `ASPNETCORE_ENVIRONMENT=Development` — learn how environment-specific configuration works.
- [X] T014 [P] Create `.gitignore` at the repo root covering `bin/`, `obj/`, `.vs/`, `*.user`, `client/node_modules/`, `client/dist/`, `API/wwwroot/`. **Why:** build output and dependencies are regenerated, never committed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Models, database access, sign-in, email sending, error handling, and the client shell — required by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Models — enums (`API/Models/Enums/`, namespace `API.Models.Enums`; files that use them add `using API.Models.Enums;`)

- [X] T015 [P] Create `API/Models/Enums/UserRole.cs` with `Customer`, `Agent`, `Admin`. **Why:** a fixed set of roles is safer as an enum than as free text — typos become compile errors.
- [X] T016 [P] Create `API/Models/Enums/TicketStatus.cs` with `Open`, `InProgress`, `Resolved`, `Closed`. **Why:** the ticket lifecycle states; `TicketRules` (T045) builds the allowed transitions on these values.
- [X] T017 [P] Create `API/Models/Enums/TicketPriority.cs` with `Low`, `Medium`, `High`, `Urgent`. **Why:** priority choices shown to customers and used for sorting.

### Models — documents (`API/Models/Entities/`, namespace `API.Models.Entities`; files that use them add `using API.Models.Entities;`)

- [X] T021 [P] Create `API/Models/Entities/User.cs` with `[BsonId, BsonRepresentation(BsonType.ObjectId)] string Id`, `Name` ("required, 1–100 chars"), `Email` ("stored lower-cased, unique"), `PasswordHash` (string? — "null until an invited user sets a password"), `Role`, `CategoryIds` (`List<string>` with `[BsonRepresentation(BsonType.ObjectId)]`; "Agents only, zero or more; MUST be empty for Customer and Admin"), `EmailVerified`, `EmailVerificationTokenHash`?, `EmailVerificationExpiresAt`?, `PasswordResetTokenHash`?, `PasswordResetExpiresAt`?, `CreatedAt`, `UpdatedAt`. **Why:** the "who is signed in" document; users are never deactivated or deleted, so there is no active flag. Learn: nullable reference types (`string?`) and how BSON attributes map a C# string to a MongoDB ObjectId.
- [X] T022 [P] Create `API/Models/Entities/Category.cs` with `Id`, `Name` ("required, 1–60 chars"), `NameNormalized` ("lower-cased trimmed name, unique"), `DefaultAgentId` (required, ObjectId representation), `IsDeleted` (soft delete, default false), `CreatedAt`, `UpdatedAt`. **Why:** categories drive both ticket classification and automatic assignment; a soft delete keeps old tickets' category names valid. Learn: soft delete vs. removing a document.
- [X] T023 *(Removed 2026-11-04: attachments dropped.)*
- [X] T025 Create `API/Models/Entities/Ticket.cs` with `Id`, `Title` ("required, 1–150 chars"), `Description` ("required, 1–5,000 chars"), `CategoryId`, `Priority`, `PriorityRank` (int 1–4), `Status`, `CustomerId`, `AssignedAgentId` (always set), `RelatedTicketId`?, `CreatedAt`, `UpdatedAt`, `ResolvedAt`?, `ClosedAt`?. **Why:** the central document. It stores only ids of related documents; names are looked up when responses are built (research R5).
- [X] T026 [P] Create `API/Models/Entities/Comment.cs` with `Id`, `TicketId`, `AuthorId`, `Body` ("required, 1–5,000 chars"), `CreatedAt`. **Why:** one message in a ticket conversation; stored in its own collection so long conversations don't bloat the ticket.

### Data — MongoDB access (`API/Data/`)

- [X] T029 [P] Create `API/Data/MongoOptions.cs` with `ConnectionString` and `Database`. **Why:** the options pattern — a typed class bound to the `Mongo` config section instead of reading raw strings everywhere.
- [X] T030 Create `API/Data/MongoDbContext.cs`: constructor takes `IMongoClient` and `IOptions<MongoOptions>`; exposes `IMongoCollection<T>` properties `Users` (`users`), `Categories` (`categories`), `Tickets` (`tickets`), `Comments` (`ticketComments`) and no file storage; a static `RegisterConventions()` that registers a convention pack (camelCase names, enums as strings, ignore extra elements) once. **Why:** one place that knows collection names; services ask it for collections (research R2). Learn: singleton lifetime — one MongoDB client for the whole app.
- [X] T031 Create `API/Data/DatabaseInitializer.cs` with `InitializeAsync()` creating all indexes from data-model.md idempotently: users `{email:1}` unique, `{role:1}`, `{categoryIds:1}`; categories `{nameNormalized:1}` unique; tickets `{customerId:1,updatedAt:-1}`, `{assignedAgentId:1,status:1,priorityRank:-1,createdAt:-1}`, `{categoryId:1,status:1,createdAt:-1}`, `{createdAt:1}`, text index `title` (weight 3) + `description` (weight 1); ticketComments `{ticketId:1,createdAt:1}`. **Why:** indexes make lists and search fast at 100k tickets and enforce uniqueness; defining them in code keeps every environment identical.

### Services — shared building blocks (`API/Services/`: `Common/`, `Settings/`, `Email/`; each subfolder is its own namespace, e.g. `API.Services.Settings`)

- [X] T032 [P] Create `API/Services/Common/AppException.cs`: `Status` (int), `Code`, `Message`, optional `Extensions` dictionary, and static factory methods for every code in contracts/rest-api.md (`Forbidden`, `EmailNotVerified`, `NotFound`, `EmailTaken`, `NameTaken`, `InvalidTransition(allowedNext)`, `TicketReadOnly`, `CategoryDeleted`, `AgentNotEligible`, `AgentIsDefault`, `InvalidCredentials`, `Validation(field, message)`). **Why:** services throw one exception type with a stable `code`; a single handler (T050) turns it into the HTTP error (research R13).
- [X] T033 [P] Create `API/Services/Common/CurrentUserInfo.cs` record `(string UserId, string Name, UserRole Role, IReadOnlyList<string> CategoryIds)`. **Why:** services need to know who is acting but should not read `HttpContext`; controllers build this from claims and pass it in.
- [X] T034 [P] Create `API/Services/Settings/AppOptions.cs` with `ClientBaseUrl`. **Why:** email links must point at the React app's address, which differs per environment.
- [X] T036 [P] Create `API/Services/Settings/SmtpOptions.cs` with `Host`, `Port`, `UseSsl`, `UserName`, `Password`, `FromAddress`, `FromName`. **Why:** typed SMTP settings; the password comes from secrets, never from source.
- [X] T036a *(Removed 2026-11-04: attachments and Cloudinary dropped.)*
- [X] T037 [P] Create `API/Services/Email/IEmailSender.cs` with `SendAsync(to, subject, textBody, htmlBody, CancellationToken)`. **Why:** `EmailService` depends on "something that sends email", so the SMTP details stay in one class. Learn: interfaces and dependency injection.
- [X] T038 Create `API/Services/Email/SmtpEmailSender.cs` implementing `IEmailSender` with MailKit (multipart text + HTML, settings from `SmtpOptions`; connect with `SecureSocketOptions.SslOnConnect` when `UseSsl` is true, otherwise `SecureSocketOptions.StartTls` — Gmail on port 587 requires STARTTLS; authenticate with `UserName`/`Password`). **Why:** the real email delivery; swapping providers touches only this file.
- [X] T039 [P] Create `API/DTOs/Common/PagedResult.cs` record `PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, long TotalCount)`. **Why:** every list endpoint pages its results the same way (constitution Principle III). Learn: generic records.
- [X] T040 [P] Create `API/DTOs/Users/UserDto.cs` record `{ Id, Name, Email, Role, CategoryIds, EmailVerified }` with a static `From(User)` method. **Why:** DTOs control exactly what leaves the server — never the password hash.
- [X] T041 [P] Create `API/DTOs/Auth/AuthRequests.cs` with records `LoginRequest(Email, Password)`, `ForgotPasswordRequest(Email)`, `ResetPasswordRequest(UserId, Token, NewPassword)` using data annotations: `[Required]`, `[EmailAddress]`, and for `NewPassword` `[MinLength(8)]` plus `[RegularExpression]` "at least one letter and one digit". **Why:** request shape is validated automatically by `[ApiController]` before your code runs. Learn: data annotations on record parameters (directly on the parameter; MVC throws if they use the `property:` target).
- [X] T042 [P] Create `API/DTOs/Categories/CategoryDto.cs` record `{ Id, Name, DefaultAgentId, DefaultAgentName, AgentCount }`. **Why:** what the API returns for a category (deleted categories are never returned).
- [X] T043 [P] Create `API/DTOs/Tickets/TicketPermissionsDto.cs` record `{ CanView, CanComment, CanChangeStatus, AllowedNextStatuses, CanEditPriority, CanReassign }`. **Why:** the same object is used by the server to allow/deny and sent to the client to show/hide buttons.

### Services — rules, auth, email (`API/Services/`)

- [X] T044 [P] Create `API/Helpers/Auth/TokenHelper.cs` (namespace `API.Helpers.Auth`) (static): 32-byte random URL-safe token, SHA-256 hash for storage, constant-time comparison. **Why:** emailed links carry a token; only its hash is stored, so a leaked database can't be used to reset passwords. Learn: `RandomNumberGenerator`, `CryptographicOperations.FixedTimeEquals`.
- [X] T045 Create `API/Helpers/Tickets/TicketRules.cs` (namespace `API.Helpers.Tickets`) (static) implementing the data-model.md lifecycle and "Who can do what on a ticket" table exactly: `AllowedNext(status)` (only `Open → InProgress`, `InProgress → Resolved`, `Resolved → Closed`; closing is manual, never automatic; tickets are never reopened); `CanComment(status)` true only for `Open`/`InProgress`; `VisibilityFilter(CurrentUserInfo)` → `FilterDefinition<Ticket>` (Customer → `customerId` = self; Agent → `categoryId` in their categories **or** `assignedAgentId` = self, so a ticket reassigned to them is always visible; Admin → all); `GetPermissions(user, ticket)` → `TicketPermissionsDto` (agents comment, change status, edit priority, and reassign only on tickets assigned to them; admins can do everything; commenting also requires `CanComment(status)`). **Why:** the single source of truth for ticket authorization (constitution Principle II); every action and every list query goes through it.
- [X] T046 Create `API/Services/Email/EmailService.cs`: takes `IEmailSender`, `IOptions<AppOptions>`, `ILogger<EmailService>`; methods `SendEmailVerificationAsync(user, token)` (link `{ClientBaseUrl}/verify-email?userId&token`), `SendPasswordResetAsync(user, token)` and `SendInvitationAsync(user, token)` (link `{ClientBaseUrl}/reset-password?userId&token`); each builds subject, text, and simple HTML and calls `IEmailSender.SendAsync` immediately inside a private `TrySendAsync` that catches any exception, logs it with `LogError` (recipient id and email type — no body), and never rethrows. **Why:** emails go out the moment the change is saved; a Gmail failure is logged but never breaks the user's action, and the user can ask again (FR-024).
- [X] T047 Create `API/Services/Auth/AuthService.cs` using `MongoDbContext.Users`, `PasswordHasher<User>`, `TimeProvider`, `EmailService`, `ILogger<AuthService>`: `LoginAsync` (unknown email, wrong password, or null `PasswordHash` → `InvalidCredentials`; no account lockout or rate limit; re-hash on `SuccessRehashNeeded`), `ForgotPasswordAsync` (always succeeds; for existing users store a hashed token valid **1 h** then send the password-reset email; calling it again is the "Send again" action and simply issues a new link), `ResetPasswordAsync` (token must match and be unexpired, single-use; new hash; `EmailVerified = true`), `GetUserAsync(id)`; log a warning on each failed sign-in without passwords or tokens. **Why:** all sign-in rules in one service. Learn: `ILogger<T>` structured logging and `TimeProvider` for testable time.
- [X] T048 Create `API/Services/Categories/CategoryService.cs` with `ListAsync(CurrentUserInfo user)` (non-deleted categories only; customers get no agent fields; `AgentCount` = agents whose `categoryIds` contain the category; `DefaultAgentName` looked up from users). **Why:** customers need the category list to submit tickets (US1); admin create/edit/delete is added in US4.
- [X] T049 Create `API/Services/Users/AdminSeeder.cs` with `SeedAsync()`: if no Admin exists, create one from `Seed:AdminEmail`/`Seed:AdminPassword` with display name `Seed:AdminName` (default "Administrator"; skip with a warning if email or password is unset); in Development only, if no categories exist, create one agent from `Seed:DevAgentName`/`Seed:DevAgentEmail`/`Seed:DevAgentPassword` (e.g. **Basma**, a Gmail plus-address) belonging to five categories — **Technical Support**, **Help Desk**, **Billing**, **Account & Access**, **Hardware & Network** — each with that agent as default agent. **Why:** the system needs a first admin, and a sample agent and categories (each with its required default agent) let US1–US2 be tried before the admin screens (US4) exist.

### Controllers and startup (`API/Controllers/`, `API/Program.cs`)

- [X] T050a [P] Create `API/DTOs/Common/ErrorResponse.cs` record `(Code, Message)` with a `[JsonExtensionData] Extra` dictionary for optional fields (`allowedNext`, field `errors`). **Why:** one small error DTO used by the exception handler, the validation response, and the cookie 401/403 answers, so every error has the same `{ code, message }` shape. Learn: `[JsonExtensionData]` flattens a dictionary into the JSON object.
- [X] T050 [P] Create `API/Controllers/Infrastructure/ApiExceptionHandler.cs` implementing `IExceptionHandler`: `AppException` → its status with `ErrorResponse(code, message)` plus its `Extensions` (`allowedNext`, field `errors`), warning log on 403; any other exception → `LogError` and 500 `ErrorResponse("server_error", ...)` with no internal details. **Why:** every error looks the same to the client (constitution Principle III) and stack traces never leak. Learn: the built-in exception-handler middleware.
- [X] T052 [P] Create `API/Controllers/Infrastructure/ClaimsPrincipalExtensions.cs` with `ToCurrentUser(this ClaimsPrincipal)` reading `NameIdentifier`, `Name`, `Role`, and one `category` claim per agent category into `CurrentUserInfo`. **Why:** the bridge from HTTP claims to the plain record services use. Learn: extension methods.
- [X] T053 Rewrite `API/Program.cs`: call `MongoDbContext.RegisterConventions()`; bind `MongoOptions`, `AppOptions`, `SmtpOptions`; register `IMongoClient` and `MongoDbContext` (singleton), `DatabaseInitializer`, `TimeProvider.System`, `PasswordHasher<User>`, `IEmailSender` → `SmtpEmailSender`, `EmailService`, `AuthService`, `CategoryService`, `AdminSeeder` (scoped); cookie authentication (cookie `ts_auth`, HttpOnly, Secure, SameSite=Strict, 8 h sliding; return 401/403 instead of redirects), authorization policies `Customer`, `Agent`, `Admin`, `AgentOrAdmin`, fallback policy = authenticated user; controllers with camelCase JSON + `JsonStringEnumConverter`; `ApiBehaviorOptions.InvalidModelStateResponseFactory` → 400 `ErrorResponse` `code: validation_failed`, message "Some fields are invalid.", with field `errors` (camelCase field names); OpenAPI; `AddExceptionHandler<ApiExceptionHandler>` + `AddProblemDetails` (only because `UseExceptionHandler()` without a path requires it; the handler writes the body); cookie 401/403 also write `ErrorResponse` (`unauthenticated`, `forbidden`); JSON console logging with `TraceIdentifier` scope; on startup run `DatabaseInitializer.InitializeAsync()` then `AdminSeeder.SeedAsync()` in a scope; middleware order: exception handler, HTTPS redirection, authentication, authorization, controllers. **Why:** `Program.cs` builds the app: services first (DI container), then the request pipeline. Learn: DI lifetimes (singleton vs scoped) and why middleware order matters.
- [X] T055 Create `API/Controllers/AuthController.cs` at `/api/v1/auth` (`[ApiController]`): `POST login` (`[AllowAnonymous]`, builds claims incl. `category` claims, `HttpContext.SignInAsync`, 200 `UserDto`), `POST logout` (204), `GET me` (200 `UserDto`), `POST forgot-password` (`[AllowAnonymous]`, 202), `POST reset-password` (`[AllowAnonymous]`, 204). **Why:** thin HTTP endpoints that call `AuthService`. Learn: attribute routing, `[AllowAnonymous]`, cookie sign-in.
- [X] T056 Create `API/Controllers/CategoriesController.cs` with `GET /api/v1/categories` calling `CategoryService.ListAsync(User.ToCurrentUser())`. **Why:** the ticket form needs categories.

### Client shell (React — grouped files allowed)

- [X] T057 [P] Create `client/src/api/client.js`: axios instance `baseURL: import.meta.env.VITE_API_BASE_URL` (from `client/.env`, default `/api/v1`; `.env` also holds `API_PROXY_TARGET` for the Vite proxy in `vite.config.js`), `withCredentials: true`; response interceptor converting the error body to `{ status, code, message, errors, allowedNext }` and redirecting to `/login` on 401 (except `/auth/me` and `/auth/login`)
- [X] T058 [P] Create `client/src/hooks/useApi.js`: `useApi(fetcher, deps)` → `{ data, loading, error, reload }`, ignoring stale responses
- [X] T059 [P] Create Tailwind components in `client/src/components/ui/`: modern light style (rounded-xl/2xl corners, soft rem shadows from `index.css` `@theme`, light blue → indigo gradient on primary buttons); `Button.jsx`, `Input.jsx`, `Textarea.jsx`, `Select.jsx`, `Badge.jsx`, `Table.jsx`, `Pagination.jsx`, `Modal.jsx` (native `<dialog>` with `showModal()`: focus stays inside, Esc closes), `Spinner.jsx`, `Skeleton.jsx`, `EmptyState.jsx`, `FieldError.jsx`, `Toast.jsx` (provider) + `useToast.js` (hook, separate file for Vite fast refresh); all inputs labeled; mobile-first and rem-only: `Button`/inputs at least `min-h-11` (2.75rem), full width below `md`; `Table` renders a normal table from `md` (48rem) and stacked label/value cards below it; `Modal` full screen below `md`; no `px` values
- [X] T060 [P] Create `client/src/components/StatusBadge.jsx` and `client/src/components/PriorityBadge.jsx` (distinct colors; `InProgress` shown as "In Progress")
- [X] T061 Create `client/src/api/auth.js` (login, logout, me, forgotPassword, resetPassword), `client/src/auth/AuthContext.jsx` + `useAuth.js` (hook in its own file) (on start `GET /auth/me`; exposes `user`, `login`, `logout`, `refresh`), `client/src/auth/ProtectedRoute.jsx` (`roles` prop; signed-out → `/login`; wrong role → Not allowed)
- [X] T062 Create `client/src/components/Layout.jsx`: dashboard layout with a light left sidebar (logo, role-based navigation with icons — Customer: My tickets, New ticket; Agent: My queue, Categories; Admin: Dashboard, Tickets, Users, Categories — and a Sign out button at the bottom in red text with no background) and a top bar with the user badge on the right (pill with a soft gradient background, no border: round initials icon first, then name with a colored role badge under it); below `md` (48rem) a menu button in the top bar opens the same sidebar as a slide-in drawer; content area uses `max-w-7xl` with rem padding; works from 20rem width
- [X] T063 [P] Create `client/src/features/auth/LoginPage.jsx` (server errors such as `invalid_credentials` shown in a toast, field errors under each field; signed-in users always go to `/` (role home page) via `auth/GuestRoute.jsx`), `ForgotPasswordPage.jsx` (always "If the email exists, a link was sent", plus "Didn't get it? Send again" that repeats the request), `ResetPasswordPage.jsx` (reads `userId`, `token`; password ≥ 8 with a letter and a digit)
- [X] T064 Create `client/src/routes.jsx`, `client/src/App.jsx`, `client/src/main.jsx` with public auth routes, `/` redirect by role (Customer → `/tickets`, Agent → `/queue`, Admin → `/admin/dashboard`), and `client/src/features/common/NotFoundPage.jsx`, `NotAllowedPage.jsx`, `ComingSoonPage.jsx` (placeholder for role pages until their tasks replace it; `/` redirect lives in `auth/RoleHomeRedirect.jsx`), wrapped in `AuthContext` and `Toast` providers

**Checkpoint**: run API and client (Atlas and Gmail via user secrets); seeded admin and dev agents can sign in/out; reset emails arrive in the Gmail inbox; a wrong password shows `invalid_credentials`.

---

## Phase 3: User Story 1 - Customer submits and tracks a ticket (Priority: P1) 🎯 MVP

**Goal**: Customers register, verify email, submit tickets, list and search their tickets, view details, and comment.

**Independent Test**: quickstart.md "Story 1" — register, verify, submit a ticket, see it in "My Tickets" as Open, open it, add a comment; another customer's ticket URL shows "Not found".

### Back end (one file per task)

- [X] T065 [US1] Edit `API/DTOs/Auth/AuthRequests.cs` to add `RegisterRequest(Name, Email, Password)` (name "required, 1–100 chars", `[EmailAddress]`, password ≥ 8 with a letter and a digit), `VerifyEmailRequest(UserId, Token)`, `ResendVerificationRequest(Email)`. **Why:** inputs for the registration use cases, validated by data annotations.
- [X] T066 [US1] Edit `API/Services/Auth/AuthService.cs` to add `RegisterAsync` (email lower-cased; duplicate → `EmailTaken` (409) — also catch the unique-index `MongoWriteException`; role `Customer`; `EmailVerified = false`; hashed token valid **24 h**; insert user then send the verification email), `VerifyEmailAsync` (single-use; invalid/expired → `Validation`), `ResendVerificationAsync` (always succeeds; new token only for unverified users). **Why:** completes the self-service account flow (FR-001, FR-002).
- [X] T067 [US1] Edit `API/Controllers/AuthController.cs` to add `POST register` (201 `UserDto`), `POST verify-email` (204), `POST resend-verification` (202); `[AllowAnonymous]`. **Why:** exposes registration over HTTP.
- [X] T068 *(Removed 2026-11-04: attachments dropped.)*
- [X] T069 [P] [US1] Create `API/DTOs/Comments/CommentDto.cs` record `{ Id, AuthorId, AuthorName, AuthorRole, Body, CreatedAt }`. **Why:** API shape for a conversation message.
- [X] T071 [P] [US1] Create `API/DTOs/Tickets/TicketSummaryDto.cs` record per contracts/rest-api.md (`Id, Title, Status, Priority, CategoryId, CategoryName, CustomerName, AssignedAgentId, AssignedAgentName, CreatedAt, UpdatedAt`). **Why:** the lightweight row used by every ticket list.
- [X] T072 [US1] Create `API/DTOs/Tickets/TicketDetailDto.cs` record with the summary fields plus `Description, RelatedTicketId?, Comments, ResolvedAt?, ClosedAt?, Permissions` (`TicketPermissionsDto`). **Why:** everything the detail page needs in one response.
- [X] T073 [P] [US1] Create `API/DTOs/Tickets/CreateTicketRequest.cs` record (JSON body): `Title` (`[Required, StringLength(150, MinimumLength = 1)]`), `Description` (`[Required, StringLength(5000, MinimumLength = 1)]`), `CategoryId` (`[Required]`), `Priority`? (default `Medium`), `RelatedTicketId`?. **Why:** JSON input for ticket creation; length limits from FR-007 enforced before the service runs.
- [X] T074 [P] [US1] Create `API/DTOs/Comments/AddCommentRequest.cs` record (JSON body): `Body` (`[Required, StringLength(5000, MinimumLength = 1)]`). **Why:** input for comments and replies.
- [X] T075 [P] [US1] Create `API/DTOs/Tickets/TicketListQuery.cs` class bound with `[FromQuery]`: `Scope`, `CategoryId`?, `Status` and `Priority` (repeatable lists), `CreatedFrom`?, `CreatedTo`?, `Q` (`[StringLength(100)]`), `Sort` (`createdAt` default, `updatedAt`, `priority`), `Dir` (`desc` default, `asc`), `Page` (default 1, `[Range(1, int.MaxValue)]`), `PageSize` (default 20, `[Range(1, 100)]`). **Why:** mirrors the list query in contracts/rest-api.md.
- [X] T076 *(Removed 2026-11-04: attachments dropped.)*
- [X] T077 [US1] Create `API/Helpers/Tickets/TicketMapper.cs` (static; names in `Helpers/Tickets/NameLookup.cs`): `ToSummary(Ticket, names)`, `ToDetail(Ticket, comments, names, permissions)`, `ToComment(Comment, names)`, where `names` is a lookup of user and category names by id. **Why:** keeps mapping code out of `TicketService`.
- [X] T078 [US1] Create `API/Services/Tickets/TicketService.cs` (uses `MongoDbContext`, `TimeProvider`, `ILogger`) with `CreateAsync(CurrentUserInfo, CreateTicketRequest)`: caller must be a verified Customer (else `EmailNotVerified` 403); category is required and must exist and not be deleted (else `CategoryDeleted` 422); priority default `Medium`, `PriorityRank` 1–4; `RelatedTicketId` "MUST be a ticket owned by the same customer" ; status `Open`; assign to the category's `DefaultAgentId` (FR-017); one `InsertOneAsync`. **Why:** the main use case of the MVP; every category has a default agent, so a ticket is assigned the moment it is created.
- [X] T079 [US1] Edit `API/Services/Tickets/TicketService.cs` to add `GetDetailAsync(user, id)` (filter = id AND `TicketRules.VisibilityFilter(user)`; missing → `NotFound` 404; load comments ordered by `createdAt`; `Permissions` from `TicketRules.GetPermissions`) and `ListAsync(user, TicketListQuery)` for `scope=mine` (any other scope for a Customer → `Forbidden`): start from `VisibilityFilter`, add status/priority/date filters, `Q` (a valid ObjectId → exact `_id`, else `$text` search), sort (`priorityRank` for priority), paging, count; add a private `LoadNamesAsync(tickets, comments?)` that collects the referenced user and category ids and loads them with one `Find(... $in ...)` per collection, returning a dictionary of id → name (and role for users) for `TicketMapper`. **Why:** documents store only ids, so names are "populated" here (research R5); returning 404 (not 403) for other people's tickets hides that they exist; starting every query from the visibility filter keeps customers from seeing each other's tickets.
- [X] T080 [US1] Edit `API/Services/Tickets/TicketService.cs` to add `AddCommentAsync(user, id, AddCommentRequest)`: not visible → 404; `Resolved`/`Closed` → `TicketReadOnly` 422; no `CanComment` → `Forbidden`; insert the comment; then set the ticket's `updatedAt`. **Why:** enforces "Resolved and Closed tickets are read-only" (FR-018).
- [X] T081 *(Removed 2026-11-04: attachments dropped.)*
- [X] T082 [US1] Edit `API/Program.cs` to register `TicketService` (scoped). **Why:** new services must be registered before controllers can receive them.
- [X] T083 [US1] Create `API/Controllers/TicketsController.cs` at `/api/v1/tickets`: `GET /` (`[FromQuery] TicketListQuery` → `PagedResult<TicketSummaryDto>`), `POST /` (`CreateTicketRequest` JSON body, 201 + `Location`), `GET /{id}`, `POST /{id}/comments` (`AddCommentRequest` JSON body, 201). **Why:** HTTP entry points for the customer flow. Learn: `[FromQuery]`, JSON body binding, `CreatedAtAction`.

### Front end (React)

- [X] T084 [P] [US1] Create `client/src/api/tickets.js` (`listTickets`, `getTicket`, `createTicket`, `addComment`) and `client/src/api/categories.js` (`listCategories`); add `register`, `verifyEmail`, `resendVerification` to `client/src/api/auth.js`
- [X] T085 [P] [US1] Create `client/src/features/auth/RegisterPage.jsx` (same rules as API; `email_taken` links to forgot password; after success shows "Check your email" with "Didn't get it? Send again" calling `resend-verification`) and `client/src/features/auth/VerifyEmailPage.jsx`
- [X] T086 *(Removed 2026-11-04: attachments dropped.)*
- [X] T087 [P] [US1] Create `client/src/components/UnverifiedBanner.jsx` with "Resend verification email"
- [X] T088 [US1] Create `client/src/features/tickets/MyTicketsPage.jsx` (`/tickets`): table, status filter, search, pagination, skeleton, empty state with "Submit a ticket"
- [X] T089 [US1] Create `client/src/features/tickets/NewTicketPage.jsx` (`/tickets/new?relatedTo=`): React Hook Form (title ≤ 150, description ≤ 5,000, active category, priority default Medium); "Follow-up to ticket {id}"; inline API field errors; keeps values on error; disabled for unverified customers
- [X] T090 [US1] Create `client/src/features/tickets/TicketDetailPage.jsx` with `client/src/features/tickets/components/TicketHeader.jsx`, `Conversation.jsx`, `CommentForm.jsx`; single column on phones, conversation + details side panel from `lg` (64rem); comment form only when `permissions.canComment`; Resolved/Closed → read-only notice + "Submit a follow-up ticket" to `/tickets/new?relatedTo=:id`; 404 → `NotFoundPage`
- [X] T091 [US1] Register `/register`, `/verify-email`, `/tickets`, `/tickets/new` (Customer), `/tickets/:id` (any role) in `client/src/routes.jsx`

**Checkpoint**: run quickstart.md "Story 1". MVP: customers can raise and follow tickets.

---

## Phase 4: User Story 2 - Agent works assigned tickets (Priority: P1)

**Goal**: Agent queue and category views, reply, status changes (including manual close), priority edits, and reassignment to any category.

**Independent Test**: quickstart.md "Story 2" and "Read-only and closing" with dev agent Basma and invited agent Carol.

### Back end (one file per task)

- [X] T092 [US2] Edit `API/Services/Tickets/TicketService.cs` to add a private `UpdateTicketAsync(id, UpdateDefinition<Ticket>)` that runs one `UpdateOneAsync` by `_id`, also setting `updatedAt` (no version check — last save wins), and returns the reloaded ticket. **Why:** every ticket change goes through one small helper. Learn: MongoDB update builders (`Builders<Ticket>.Update.Set(...)`).
- [X] T093 [US2] Edit `API/Services/Tickets/TicketService.cs` `ListAsync` to support `scope=assigned` (Agent default: `assignedAgentId` = self) and `scope=category` (`CategoryId` must be one of the agent's, else `Forbidden`; omitted = all their categories); reject scopes not allowed for the role with `Forbidden`. **Why:** agents see their queue and their categories, never other categories.
- [X] T094 [P] [US2] Create `API/DTOs/Tickets/ChangeStatusRequest.cs` record `([Required] TicketStatus Status)`. **Why:** input for a status change.
- [X] T095 [P] [US2] Create `API/DTOs/Tickets/UpdatePriorityRequest.cs` record `([Required] TicketPriority Priority)`. **Why:** input for a priority edit (the category changes only through reassignment).
- [X] T096 [P] [US2] Create `API/DTOs/Tickets/AssignTicketRequest.cs` record `([Required] string AgentId, [Required] string CategoryId)`. **Why:** input for reassignment — the agent picks the new agent and one of that agent's categories.
- [X] T098 [US2] Edit `API/Services/Tickets/TicketService.cs` to add `ChangeStatusAsync(user, id, ChangeStatusRequest)`: not visible → 404; no `CanChangeStatus` → `Forbidden`; not in `TicketRules.AllowedNext` → `InvalidTransition` (422) with `allowedNext`; set `Status` and `ResolvedAt`/`ClosedAt` via `UpdateTicketAsync`. **Why:** the lifecycle (FR-015).
- [X] T099 [US2] Edit `API/Services/Tickets/TicketService.cs` to add `UpdatePriorityAsync`: requires `CanEditPriority`; set `Priority` and `PriorityRank` via `UpdateTicketAsync`. **Why:** FR-019.
- [X] T100 [US2] Edit `API/Services/Tickets/TicketService.cs` to add `AssignAsync(user, id, AssignTicketRequest)`: requires `CanReassign`; target must be a user with role `Agent` whose `categoryIds` contains `CategoryId` (else `AgentNotEligible` 422); category must exist and not be deleted (else `CategoryDeleted` 422); set `AssignedAgentId` and `CategoryId` via `UpdateTicketAsync`. **Why:** FR-016 — when the description belongs to another area, the ticket moves to an agent of any category and its category follows.
- [X] T103 [P] [US2] Create `API/DTOs/Users/AgentDto.cs` record `{ Id, Name, Categories }` where `Categories` is a list of `{ Id, Name }` (non-deleted only). **Why:** the reassign picker shows agents with their categories so the user can choose both.
- [X] T104 [US2] Create `API/Services/Users/UserService.cs` with `ListAgentsAsync()` (users with role `Agent`, sorted by name, each with their non-deleted categories' ids and names). **Why:** supplies the reassign and default-agent pickers; admin user management is added here in US4.
- [X] T105 [US2] Edit `API/Program.cs` to register `UserService` (scoped). **Why:** services only run if registered.
- [X] T106 [US2] Create `API/Controllers/AgentsController.cs` with `GET /api/v1/agents` (policy `AgentOrAdmin`) → `AgentDto[]`. **Why:** HTTP access to the agent list for agents and admins only.
- [X] T107 [US2] Edit `API/Controllers/TicketsController.cs` to add `POST /{id}/status`, `PATCH /{id}` (priority), `POST /{id}/assign`, each returning 200 `TicketDetailDto`. **Why:** HTTP entry points for agent actions.

### Front end (React)

- [X] T108 [P] [US2] Add `changeStatus`, `updatePriority`, `assignTicket` to `client/src/api/tickets.js`; create `client/src/api/agents.js` (`listAgents`)
- [X] T109 [US2] Create `client/src/features/tickets/components/TicketActions.jsx` and add it to `TicketDetailPage.jsx`: status buttons from `allowedNextStatuses` (including **Close** on Resolved tickets), priority select when `canEditPriority`, "Reassign" modal when `canReassign` (pick an agent from any category, then one of that agent's categories; explains the ticket's category will change); 422 `invalid_transition` → show allowed next status; `agent_not_eligible` → inline error
- [X] T110 [P] [US2] Create `client/src/features/agent/AgentQueuePage.jsx` (`/queue`): `scope=assigned`, status/priority filters, sort, search, pagination, empty state
- [X] T111 [P] [US2] Create `client/src/features/agent/CategoryTicketsPage.jsx` (`/categories/:categoryId?`): tabs per agent category, status filter, read-only badge for tickets assigned to others
- [X] T112 [US2] Register `/queue` and `/categories/:categoryId?` (Agent) in `client/src/routes.jsx`

**Checkpoint**: run quickstart.md "Story 2" and "Read-only and closing".

---

## Phase 5: User Story 3 - *(Removed 2026-11-04)*

*(Removed 2026-11-04 by owner decision: ticket-update notifications dropped to keep the app simple. No tasks to run; account emails stay in Foundational and US1/US4.)*

- [X] T113 *(Removed 2026-11-04: ticket-update notifications dropped.)*
- [X] T114 *(Removed 2026-11-04: ticket-update notifications dropped.)*
- [X] T115 *(Removed 2026-11-04: ticket-update notifications dropped.)*

---

## Phase 6: User Story 4 - Admin manages users, roles, and categories (Priority: P2)

**Goal**: Invite, list, and edit users (no delete); category CRUD with soft delete and a required default agent; see all tickets.

**Independent Test**: quickstart.md "Setup data (Story 4)".

### Back end (one file per task)

- [X] T116 [P] [US4] Create `API/DTOs/Users/AdminUserRequests.cs` with `CreateUserRequest(Name, Email, Role, CategoryIds)` (name "1–100 chars", `[EmailAddress]`), `UpdateUserRequest(Name, Role, CategoryIds)`, and `UserListQuery(Role?, Q?, Page, PageSize ≤ 100)`. **Why:** inputs for admin user management (no deactivate, no delete).
- [X] T117 [US4] Edit `API/Services/Users/UserService.cs` to add `ListAsync(UserListQuery)` (name/email search, paging, total count → `PagedResult<UserDto>`), `GetAsync(id)`, and `CreateAsync` (Agents may have zero or more categories, Customer/Admin categories "MUST be empty" → `Validation`; email unique → `EmailTaken` 409; `PasswordHash` null; invitation token valid **72 h**; insert then send the invitation email; if it never arrives, the invited user can use Forgot password to get a new link). **Why:** admins onboard agents without knowing their passwords; role-dependent rules are checked in the service.
- [X] T118 [US4] Edit `API/Services/Users/UserService.cs` to add `UpdateAsync(admin, id, UpdateUserRequest)`: same category rules; admins cannot remove their own Admin role (`Validation` 400); if the user is any category's `defaultAgentId`, changing their role away from Agent or removing that category from `CategoryIds` → `AgentIsDefault` 422. There is no delete. **Why:** keeps the rule "every category has a default agent who belongs to it" true at all times.
- [X] T119 [P] [US4] Create `API/DTOs/Categories/CategoryRequests.cs` with `CategoryRequest(Name, DefaultAgentId)` used for both create and update; name `[Required, StringLength(60, MinimumLength = 1)]`, `DefaultAgentId` `[Required]`. **Why:** inputs for category management; the default agent is required.
- [X] T120 [US4] Edit `API/Services/Categories/CategoryService.cs` to add `GetAsync(id)`, `CreateAsync`, `UpdateAsync`, and `DeleteAsync`: `NameNormalized` = lower-cased trimmed, unique (`NameTaken` 409, also on unique-index error); `DefaultAgentId` MUST be a user with role `Agent` (else `AgentNotEligible` 422) and saving adds the category to that agent's `categoryIds` (`$addToSet`); delete → set `IsDeleted = true` (soft delete; tickets still show the name because it is looked up by id); deleted categories → `NotFound`. **Why:** full CRUD for categories while keeping old tickets readable. Learn: `$addToSet` and soft deletes.
- [X] T121 [US4] Edit `API/Services/Tickets/TicketService.cs` `ListAsync` to support `scope=all` (Admin only). **Why:** admins see every ticket.
- [X] T122 [US4] Create `API/Controllers/AdminUsersController.cs` at `/api/v1/admin/users` (`GET /`, `GET /{id}`, `POST /` 201, `PUT /{id}`; policy `Admin`; no delete). **Why:** HTTP access to user management, admins only.
- [X] T123 [US4] Edit `API/Controllers/CategoriesController.cs` to add `GET /{id}`, `POST /` (201), `PUT /{id}`, and `DELETE /{id}` (204) with policy `Admin`. **Why:** category CRUD endpoints.

### Front end (React)

- [X] T124 [P] [US4] Create `client/src/api/users.js` (`listUsers`, `getUser`, `createUser`, `updateUser`); add `createCategory`, `updateCategory`, `deleteCategory` to `client/src/api/categories.js`
- [X] T125 [US4] Create `client/src/features/admin/AdminUsersPage.jsx` (`/admin/users`): **Customers** and **Agents** tabs (`?tab=`, owner decision 2026-11-04) instead of a role filter, search, pagination; "Invite user" modal (category multi-select for Agents, optional); edit modal for name, role, and categories; shows `agent_is_default`; no delete or deactivate action
- [X] T126 [US4] Create `client/src/features/admin/AdminCategoriesPage.jsx` (`/admin/categories`): list, create/rename with a **required** default-agent select from `GET /agents`, delete with a confirmation ("existing tickets keep this category name"); shows `name_taken`, `agent_not_eligible`
- [X] T127 [US4] Create `client/src/features/admin/AdminTicketsPage.jsx` (`/admin/tickets`): `scope=all`, status/priority/category filters, search, pagination; initial filters from the query string
- [X] T128 [US4] Register `/admin/users`, `/admin/categories`, `/admin/tickets` (Admin) in `client/src/routes.jsx`

**Checkpoint**: run quickstart.md "Setup data (Story 4)".

---

## Phase 7: User Story 5 - Admin views ticket dashboard (Priority: P3)

**Goal**: Counts by status and priority, date filter, drill-down.

**Independent Test**: quickstart.md "Story 5" — dashboard counts match the tickets created; drill-down and date range work; search is scoped per role.

- [X] T129 [P] [US5] Create `API/DTOs/Dashboard/DashboardDto.cs` record `{ Total, ByStatus (Open, InProgress, Resolved, Closed), ByPriority (Low, Medium, High, Urgent) }`. **Why:** the API response shape.
- [X] T130 [US5] Create `API/Services/Dashboard/DashboardService.cs` with `GetAsync(createdFrom?, createdTo?)`: one aggregation on `tickets` — `$match` on `createdAt`, then `$facet` for status counts, priority counts, and total; fill missing status/priority keys with 0. **Why:** exact counts in a single database round trip (SC-008). Learn: MongoDB aggregation pipelines from C#.
- [X] T131 [US5] Edit `API/Program.cs` to register `DashboardService` (scoped). **Why:** make it injectable.
- [X] T132 [US5] Create `API/Controllers/DashboardController.cs` (`GET /api/v1/admin/dashboard?createdFrom&createdTo`, policy `Admin`). **Why:** HTTP access to the dashboard.
- [X] T133 [P] [US5] Create `client/src/api/dashboard.js` (`getDashboard`)
- [X] T134 [US5] Create `client/src/features/admin/DashboardPage.jsx` (`/admin/dashboard`): date range, responsive card grid (1 column on phones, 2 from `sm`, 4 from `lg`) for total, each status and each priority, each linking to `/admin/tickets` with matching filters; register the route (Admin) in `client/src/routes.jsx`

**Checkpoint**: run quickstart.md "Story 5", including search scoping for customer, Carol, and admin.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T135 Edit `API/Program.cs` to add an inline middleware setting `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and a basic `Content-Security-Policy`; HSTS outside Development; `UseStaticFiles`; `MapFallbackToFile("index.html")` for non-`/api` routes. **Why:** browser-level protections, and serving the built React app from the API makes production same-origin (needed for the SameSite cookie). Learn: writing middleware with `app.Use(...)`.
- [ ] T136 [P] Edit `client/vite.config.js` (`build.outDir` = `../API/wwwroot`, `emptyOutDir`) and add a `publish` script to `client/package.json`
- [ ] T137 [P] Accessibility and responsive pass across `client/src/`: labels on every field, errors linked with `aria-describedby`, focus-trapped modals, badges not color-only; every page checked at 20rem, 48rem, and 90rem viewport widths with no horizontal scrolling; layout scales when the browser font size is increased; `npm run lint` (no-px check) passes
- [ ] T138 [P] Create `README.md` at the repo root: purpose (learning .NET), prerequisites, how to run (link to quickstart.md), configuration keys, where secrets go, and a "Tour of the back end" walking the `API/` folders in the order the tasks build them (Models → Data → Services → Controllers). **Why:** a newcomer can follow the same learning path.
- [ ] T139 Review the code against constitution v4.0.0 Principles I–V: only the `API` project exists; controllers never use `MongoDbContext`; no business rules in controllers, jobs, or the client; every ticket list/detail query starts from `TicketRules.VisibilityFilter`; models never returned from controllers; no secrets/tokens in source or logs; every .NET file has its Why explained
- [ ] T140 Run `dotnet build` (no errors, no new warnings), `npm run lint` and `npm run build` in `client/`, then every scenario in `specs/001-support-ticket-system/quickstart.md`, and fix failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: builds on US1's `TicketService.cs`, `TicketsController.cs`, `TicketDetailPage.jsx` — after US1
- **US3 (Phase 5)**: removed 2026-11-04 (ticket-update notifications dropped); nothing to run
- **US4 (Phase 6)**: depends on Foundational and on `UserService.cs` (T104, US2) (coordinate edits to `TicketService.cs`, `CategoryService.cs`, `Program.cs`). Dev seed (T049) lets US1–US2 work without it
- **US5 (Phase 7)**: drill-down uses `AdminTicketsPage` from US4 (T127)
- **Polish (Phase 8)**: after the desired stories

```text
Setup → Foundational → US1 (MVP) → US2
                                     ↘ US4 ──→ US5
(US3 removed 2026-11-04)
```

### Within each story

- Models → DTOs → Services → `Program.cs` registration → Controllers → client
- Tasks editing the same file run in ID order

### Learning order

For learning, follow the IDs strictly. Each file only uses files that already exist: models first (plain C#), then the database context, then services, then controllers and `Program.cs`.

### Parallel Opportunities (if working in a team)

- Setup: T005–T007, T009–T014
- Foundational: enums and models T015–T017, T021, T022, T026; T029; shared service/DTO files T032–T037, T039–T044; T050–T052; client shell T057–T060, T063 alongside back-end work
- US1: DTOs T069, T071, T073–T075; client T084, T085, T087
- US2: requests T094–T096; T103; client T108, T110, T111
- US4: T116, T119, T124

---

## Parallel Example: User Story 1

```text
Task: "T069 Create API/DTOs/Comments/CommentDto.cs"
Task: "T071 Create API/DTOs/Tickets/TicketSummaryDto.cs"
Task: "T073 Create API/DTOs/Tickets/CreateTicketRequest.cs"
Task: "T084 Create client/src/api/tickets.js and categories.js"
Task: "T087 Create client/src/components/UnverifiedBanner.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup → Phase 2: Foundational → Phase 3: US1
2. **STOP and VALIDATE** with quickstart.md "Story 1"

### Incremental Delivery

1. Setup + Foundational → sign-in works
2. + US1 → customers raise tickets (MVP)
3. + US2 → full support loop
4. + US4 → admin screens (US3 email notifications removed 2026-11-04)
5. + US5 → dashboard
6. Polish → production hosting, headers, accessibility, README

---

## Notes

- Task IDs run to T140 with gaps where tasks were removed (T051, T018, T019, T020, T024, T027, T028, T035, T054, T070, T097, T101, T102); tasks T023, T036a, T068, T076, T081, T086 are kept as "Removed 2026-11-04" (attachments and Cloudinary dropped by owner decision); tasks T113–T115 (Phase 5, US3) are kept as "Removed 2026-11-04" (ticket-update notifications dropped by owner decision); every .NET task touches one file and has a **Why** (constitution Principle V). Exceptions: deletion tasks T005–T007 remove whole placeholder folders
- During `/speckit-implement`, after each .NET file: explain what it does, the .NET concepts used, and how it connects to neighboring files
- No automated tests in v1; each checkpoint is a manual quickstart.md run
- Every React task is mobile-first and rem-only: no `px` in CSS, Tailwind arbitrary values, or inline styles (constitution, Front-end styling); `npm run lint` enforces it
- Permission rules live only in `Helpers/Tickets/TicketRules.cs` (no database calls; `TicketService` loads data and asks it)
