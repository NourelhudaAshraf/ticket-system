# Implementation Plan: Support Ticket System

**Branch**: `001-support-ticket-system` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-support-ticket-system/spec.md`

## Summary

A web support ticket system with three roles. Customers register, submit tickets,
track and comment on them. Agents belong to categories, get new tickets auto-assigned via each
category's default agent, can see (read-only) all tickets in their categories, reply, move tickets through Open → In Progress → Resolved → Closed, and reassign to an agent of any
category (the ticket's category follows). Resolved
and Closed tickets are read-only; agents close Resolved tickets manually (no auto-close). Admins manage users (no delete or
deactivate), categories (soft delete; every category has a default agent), and see a dashboard.
No ticket history and no edit-conflict check (simple CRUD app, constitution v4.0.0). No email notifications on ticket updates (removed 2026-11-04); only account emails are sent.

Technical approach (revised 2026-11-02 for constitution v4.0.0): one ASP.NET Core 10 Web API
project, `API`, organized by folders (`Controllers/`, `Models/`, `DTOs/`, `Services/`, `Data/`). MongoDB runs as a single instance — no replica set, no transactions. Ticket
updates are plain single-document writes (last save wins). Account emails (verification, password reset, invitation) are sent immediately after the change is saved; a failed send is logged and never fails
the action (no queue, no background job). There are no file attachments (removed 2026-11-04); search uses a text index. Cookie authentication. React 19 single-page app in JavaScript, built with Vite, styled with Tailwind CSS,
calling the API with axios, in `client/`. No automated tests in v1; features are verified manually
with [quickstart.md](quickstart.md). Details and alternatives are in [research.md](research.md).

## Technical Context

**Language/Version**: C# on .NET 10 (SDK 10.0.403, nullable enabled); JavaScript (ES2023, JSX) on Node.js 24 LTS

**Primary Dependencies**: ASP.NET Core 10 (controllers, cookie auth,
OpenAPI, data annotations), MongoDB.Driver 3.x, `PasswordHasher<T>` (password hashing, part of the
shared framework), MailKit; React 19, Vite, React Router, axios, React Hook Form, Tailwind CSS 4

**Storage**: MongoDB 8 on MongoDB Atlas (the app uses no transactions, so it works the same on a
single instance)

**Testing**: None in v1 (owner decision). Verification is manual via
[quickstart.md](quickstart.md); ESLint runs on the client.

**Target Platform**: Linux or Windows server / container for the API; current desktop and mobile browsers

**Project Type**: Web application (REST API + single-page front end)

**Performance Goals**: list, detail, and search p95 < 2 s with 100,000 tickets (SC-003, SC-003a);
500 concurrent signed-in users (SC-004)

**Constraints**: every ticket gets an assigned agent on
create; email failures never block user actions; English only; mobile-first
responsive UI from 20rem width; all front-end lengths in `rem` — no `px` (enforced by a lint check)

**Scale/Scope**: ~100k tickets, hundreds of agents, 3 roles, ~15 screens, ~25 endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Checked against
constitution v3.0.0.

| Principle | Gate | Pre-research | Post-design |
|-----------|------|--------------|-------------|
| I. Simple Single-Project Structure | One `API` project with its folders; business rules only in `Services/`; controllers never use `Data/`; jobs call services; client does not own rules | ✅ | ✅ Folder layout below; `TicketService` + static `Helpers/Tickets/TicketRules` hold all ticket rules (deviation: rules without DB calls live in `Helpers/`, see Complexity Tracking); no background jobs in v1; client renders from server-computed `permissions` |
| II. Security & RBAC | Server-side role + record checks; hashed passwords; expiring tokens; no secrets in repo; no sensitive logs | ✅ | ✅ `TicketRules` used by every ticket action and list query; invisible tickets → 404; PBKDF2 hashes; hashed single-use tokens; no lockout, rate limit, or antiforgery (owner: keep v1 simple); secrets via user-secrets/env |
| III. Consistent API Contracts | REST/JSON, OpenAPI, DTOs from `DTOs/`, one error format with codes, paging, versioning | ✅ | ✅ `/api/v1`, [contracts/rest-api.md](contracts/rest-api.md) with error code table and paged lists; models never returned |
| IV. Simplicity & Observability | Only spec'd features; no Unit of Work, transactions, outbox, FluentValidation, or extra projects; structured logs + correlation id; no history or concurrency check in v1 | ✅ | ✅ Data annotations + service checks; plain updates; emails sent inline; failed auth + failed emails logged |
| V. Learning-First | One file per .NET task with a Why | ✅ | ✅ Folder layout keeps each file's role obvious; enforced in `tasks.md` |
| Stack & Constraints | .NET 10, React (JavaScript) + Tailwind + axios, MongoDB (Atlas) with indexes in `Data/`, async I/O, email behind an interface in `Services/`, sent immediately, failures logged | ✅ | ✅ `Data/DatabaseInitializer.cs`, `Services/Email/IEmailSender.cs` |
| Workflow & Quality Gates | Build clean, client lint passes, quickstart scenarios checked manually | ✅ | ✅ [quickstart.md](quickstart.md) covers every user story and the security spot checks |

**Result**: PASS. No violations. Additions that need justification are listed in Complexity
Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-support-ticket-system/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R17
├── data-model.md        # Phase 1: collections, rules, lifecycle, permissions
├── quickstart.md        # Phase 1: run + validation scenarios
├── contracts/
│   ├── rest-api.md      # Phase 1: HTTP endpoints, DTOs, error codes
│   └── ui-routes.md     # Phase 1: client routes and UI states
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
TicketSystem.slnx                  # contains only API (Domain, Application, Persistence removed)
                                   # dev MongoDB = Atlas, dev SMTP = Gmail; both via user secrets

API/
├── Program.cs                     # service registration + middleware pipeline
├── appsettings.json, appsettings.Development.json
├── Controllers/                   # thin HTTP layer, one controller per area (namespace API.Controllers):
│   │                              # AuthController, TicketsController, AgentsController,
│   │                              # CategoriesController, AdminUsersController, DashboardController
│   └── Infrastructure/            # not controllers: ApiExceptionHandler (AppException → Problem
│                                  # Details), ClaimsPrincipalExtensions
├── Models/                        # Entities/ (API.Models.Entities): User, Category, Ticket,
│                                  # Comment;
│                                  # Enums/ (namespace API.Models.Enums): UserRole, TicketStatus, TicketPriority
├── DTOs/                          # request/response records with data annotations, one subfolder
│   │                              # (namespace API.DTOs.<Folder>) per area:
│   ├── Common/                    # PagedResult<T>
│   ├── Auth/                      # AuthRequests
│   ├── Users/                     # UserDto, AdminUserRequests, AgentDto
│   ├── Categories/                # CategoryDto, CategoryRequests
│   ├── Tickets/                   # TicketSummaryDto, TicketDetailDto, TicketPermissionsDto,
│   │                              # CreateTicketRequest, TicketListQuery, ChangeStatusRequest,
│   │                              # UpdatePriorityRequest, AssignTicketRequest
│   ├── Comments/                  # CommentDto, AddCommentRequest
│   └── Dashboard/                 # DashboardDto
├── Services/                      # one subfolder (and namespace API.Services.<Folder>) per area:
│   ├── Common/                    # AppException, CurrentUserInfo
│   ├── Settings/                  # AppOptions, SmtpOptions
│   ├── Email/                     # IEmailSender, SmtpEmailSender (MailKit), EmailService
│   ├── Auth/                      # AuthService
│   ├── Users/                     # UserService, AdminSeeder
│   ├── Categories/                # CategoryService
│   ├── Tickets/                   # TicketService
│   └── Dashboard/                 # DashboardService
├── Helpers/                       # static helpers with no database calls (Services/ owns all DB access)
│   ├── Auth/                      # TokenHelper (random link tokens, SHA-256 hash, constant-time compare)
│   └── Tickets/                   # TicketRules (visibility filter, permissions, transitions),
│                                  # TicketMapper + NameLookup (documents → DTOs)
└── Data/                          # MongoDbContext (typed collections),
                                   # MongoOptions, DatabaseInitializer (indexes, enum-as-string)

client/                            # React 19 + JavaScript + Vite + Tailwind CSS
├── src/
│   ├── api/
│   │   ├── client.js              # axios instance: baseURL /api/v1, withCredentials,
│   │   │                          # error interceptor ({ code, message })
│   │   └── tickets.js, auth.js, categories.js, users.js, dashboard.js, agents.js
│   ├── hooks/                     # useApi (loading/error/data state around axios calls)
│   ├── auth/                      # AuthContext (current user), ProtectedRoute
│   ├── features/
│   │   ├── auth/                  # login, register, verify, forgot/reset
│   │   ├── tickets/               # list, new, detail, comments, actions
│   │   ├── agent/                 # queue, category view
│   │   └── admin/                 # dashboard, users, categories, all tickets
│   ├── components/                # layout, table, pagination, badges, toast
│   ├── index.css                  # Tailwind entry
│   └── routes.jsx
└── vite.config.js                 # @tailwindcss/vite plugin, /api proxy to the API
```

**Structure Decision**: Single `API` project per constitution v3.0.0 Principle I, plus `client/`
for the React app. The placeholder `Domain`, `Application`, and `Persistence` projects (only
`Class1.cs`) and the WeatherForecast sample are deleted and removed from `TicketSystem.slnx`. No
test projects in v1. Services use `MongoDbContext` collections directly; there are no repository
or Unit of Work classes. Controllers read the signed-in user from claims and pass a
`CurrentUserInfo` record into services.

## Key Design Notes

- **Every ticket action** goes through `TicketRules.GetPermissions(user, ticket)`, which produces
  the same `TicketPermissionsDto` returned to the client — one source for API checks and UI
  buttons.
- **Every list/search query** starts from `TicketRules.VisibilityFilter(user)` (a MongoDB filter:
  customer id, agent category ids, or all); search and list filters are combined with it, never
  replace it.
- **Write path** for a ticket change: load ticket → permission check → transition check → one
  `UpdateOne` that sets the new values. No email is sent for ticket changes (notifications removed 2026-11-04).
- **Errors**: services throw `AppException(status, code, message, extensions?)`;
  `ApiExceptionHandler` (built-in `IExceptionHandler`) turns it into `{ code, message }` (`DTOs/Common/ErrorResponse`). Request
  shape is validated with data annotations on DTOs (automatic 400 `validation_failed` via
  `[ApiController]`); business validation lives in services.
- **Configuration** (`appsettings.json` + env): `Mongo:ConnectionString`, `Mongo:Database`,
  `Smtp:*`, `App:ClientBaseUrl` (links in account emails), `Seed:Admin*`.
- **Styling**: Tailwind's built-in scale is already rem-based (spacing, font sizes, radii, and
  breakpoints `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem), so standard utilities are used as-is.
  Anything Tailwind emits in `px` by default (e.g., 1px border/ring/divide/outline widths) is
  overridden in `client/src/index.css` `@theme`/base layer with `0.0625rem`, or written as rem
  arbitrary values (`border-[0.0625rem]`). Arbitrary values in `px` are forbidden. Mobile-first:
  base classes target phones, `md:`/`lg:` add tablet/desktop layout. `client/scripts/check-no-px.js`
  fails `npm run lint` if `px` appears in `client/src` or `client/index.html`.
- **Logging**: built-in `ILogger` with JSON console output, correlation id per request
  (`TraceIdentifier`), warnings on failed authorization and failed sign-ins, errors on account emails
  that could not be sent.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| MailKit | Reliable SMTP client | `System.Net.Mail.SmtpClient` is not recommended by Microsoft for new code |
| Swashbuckle.AspNetCore.SwaggerUI (Development only) | A browsable page at `/swagger` to read and try the endpoints while learning | The built-in `/openapi/v1.json` is raw JSON with no viewer since .NET 9 |
| `Helpers/` folder outside `Services/` | Owner decision (2026-11-03): `Services/` holds only classes that call the database; pure static rules (`TicketRules`, `TokenHelper`) live in `Helpers/` | Keeping them in `Services/` (constitution Principle I wording) mixes database access with pure logic; amend the constitution to allow `Helpers/` |
| Simple `{ code, message }` errors instead of RFC 9457 Problem Details | Owner decision (2026-11-03): the client only needs a message to show and a code to branch on | Problem Details (constitution Principle III wording) adds `type`/`title`/`status`/`traceId` the client never uses; amend the constitution |
| axios, React Hook Form, Tailwind CSS | axios: interceptors for errors; React Hook Form: form state and validation; Tailwind: styling without a component library | `fetch` needs a hand-written XSRF/error wrapper; hand-written form state is more code per form |

Removed in the 2026-11-02 revision: the `Infrastructure` project, the layered `Domain` /
`Application` / `Persistence` projects, Unit of Work, MongoDB replica set and transactions,
transactional outbox, FluentValidation, and `Result<T>`.

Removed 2026-11-04 (owner decision, to keep the app simple): file attachments and Cloudinary —
`Models/Entities/Attachment`, `DTOs/Attachments/`, `Services/Attachments/`, `Helpers/Attachments/`,
`CloudinaryOptions`, the attachment download endpoint, and multipart uploads. Ticket create and
comment create now take plain JSON bodies (`CreateTicketRequest`, `AddCommentRequest`).

Removed 2026-11-04 (owner decision, to keep the app simple): User Story 3 ticket-update
notifications — no emails on new ticket, replies, customer comments, status changes, or
reassignment (FR-021–FR-023, SC-005). `EmailService` keeps only account emails (verification,
password reset, invitation).
