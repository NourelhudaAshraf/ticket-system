# Research: Support Ticket System

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-02 (revised
for constitution v3.0.0; originally 2026-10-29)

Each entry records a decision, why it was chosen, and what else was considered. All
"NEEDS CLARIFICATION" items from the Technical Context are resolved here.

## R1. Back-end application structure

- **Decision** (owner-specified, 2026-11-02): One ASP.NET Core project, `API`, with plain folders:
  `Controllers/`, `Models/`, `DTOs/`, `Services/`, `Data/` (plus `BackgroundJobs/` only if a
  feature needs a hosted service; none in v1). Business logic is
  written as plain service classes (e.g., `TicketService`) that use the `MongoDbContext`
  collections directly — no repositories, no Unit of Work, no mediator library. The placeholder
  `Domain`, `Application`, and `Persistence` projects are deleted.
- **Rationale**: Constitution v3.0.0 Principle I. The project's purpose is learning .NET; one
  project with obvious folders is the standard ASP.NET Core starting layout and the easiest to
  follow file by file. Keeping rules in services (not controllers) still gives each concern one home.
- **Alternatives considered**: The previous four-plus-one layered projects (more indirection than
  this app needs; rejected by owner); two projects `API` + `Core` (still splits a small app);
  MediatR/CQRS (extra indirection, commercial license for newer versions).

## R2. MongoDB access

- **Decision**: Official `MongoDB.Driver` (3.x). `Data/MongoDbContext` exposes typed collections
  for each collection. Models in `Models/` may use BSON attributes (`[BsonId]`,
  `[BsonRepresentation]`) directly; enums are stored as strings via a convention registered once.
  Indexes are created at startup by an idempotent `Data/DatabaseInitializer`.
- **Rationale**: First-party driver, supports aggregation and text indexes. With one
  project there is no layer to keep free of Mongo types, so attributes on models are the simplest
  mapping and are visible where the data is defined.
- **Alternatives considered**: MongoDB EF Core provider (fewer features for aggregation,
  less control over indexes); separate BSON class maps (extra files with no benefit in one project).

## R3. Ticket writes (no history)

- **Decision** (owner-specified, 2026-11-02): No ticket history. Every ticket change is a single
  `UpdateOne` that sets the new values. No transactions. No email is sent for
  ticket changes (ticket-update notifications removed 2026-11-04).
- **Rationale**: The app is meant to show plain CRUD operations; history adds an embedded array,
  a DTO, and UI with no learning value for this goal.
- **Risk accepted**: no record of who changed what.
- **Alternatives considered**: Embedded `history` array pushed in the same write (removed by owner,
  constitution v4.0.0).

## R4. Concurrent edits

- **Decision** (owner-specified, 2026-11-02): **Last write wins.** No `version` field, no 409.
- **Rationale**: Keeps every update a simple `UpdateOne` by id, which is easier to learn.
- **Risk accepted**: if two people change the same ticket at once, the later save silently
  replaces the earlier one.
- **Alternatives considered**: Optimistic concurrency with a `version` field (removed by owner,
  constitution v4.0.0).

## R5. Ticket identity and related names

- **Decision** (owner-specified, 2026-11-03): Tickets are identified by their MongoDB `_id`; there
  is no ticket-number sequence or `counters` collection. Documents store only ids of related
  documents (category, customer, agent, comment author); services load the names with one `$in`
  query per collection for each page of results.
- **Rationale**: Simplest possible POC: no counter, no copied names to keep in sync on rename.
- **Risk accepted**: ids are long in URLs and emails; each list does 2–3 small extra queries.
- **Alternatives considered**: `counters` sequence with `TKT-000123` (removed by owner);
  copying names into tickets (removed by owner, needs `UpdateMany` on rename); `$lookup`
  aggregation (works, but more verbose to read than separate `$in` queries).

## R6. Authentication

- **Decision**: ASP.NET Core **cookie authentication** (HttpOnly, Secure, SameSite=Strict,
  8-hour sliding expiry) with the user's id and role as claims. No antiforgery tokens
  (owner decision 2026-11-04: keep the learning app simple). Passwords are hashed with
  `PasswordHasher<T>` from `Microsoft.Extensions.Identity.Core` (PBKDF2). Users live in our own
  `users` collection.
- **Rationale**: The React app is served from the same site as the API (Vite dev proxy locally,
  same origin in production), so cookies avoid storing tokens in JavaScript and need no refresh-token
  logic. The SameSite=Strict cookie is not sent on requests started by
  other sites, which covers the common cross-site request case without antiforgery tokens.
- **Alternatives considered**: JWT bearer tokens with refresh tokens (more moving parts, tokens
  reachable by XSS if kept in storage); full ASP.NET Core Identity (needs a third-party MongoDB
  store and brings many unused features).

## R7. Email verification, password reset, invitations

- **Decision**: Generate 32-byte random tokens, email them in a link, and store only their SHA-256
  hash plus expiry on the user (verification: 24 h; reset: 1 h per spec; admin invitation:
  72 h, reusing the reset flow). Tokens are single-use.
- **Rationale**: A stolen database does not reveal usable tokens; one flow serves reset and
  invitation.
- **Alternatives considered**: ASP.NET Data Protection time-limited tokens (cannot be invalidated
  after use without extra state).

## R8. Sign-in protection (none in v1)

- **Decision**: No account lockout and no rate limiting (owner decisions 2026-11-03 and
  2026-11-04: this is a learning project, keep it simple). A wrong password simply returns
  `invalid_credentials`.
- **Rationale**: Less code and configuration to understand; the app is not exposed to real attackers.
- **Alternatives considered**: Per-IP rate limiter on `/auth/*` (removed 2026-11-04); per-account
  lockout after 5 failures (removed 2026-11-03). Both should be added before a public deployment.

## R9. Attachments *(Removed 2026-11-04)*

- **Decision** (owner-specified, 2026-11-04): No file attachments. Tickets and comments are text
  only, and ticket create / comment create take plain JSON bodies.
- **Rationale**: Keeps the learning app simple: no external file storage service, no upload
  validation, and no download permission flow.

## R10. Search

- **Decision**: If the query is a valid 24-character ObjectId, do an exact lookup on `_id`. Otherwise use a MongoDB **text index** on `title` (weight 3) and `description`
  (weight 1). The caller's visibility filter (customer / agent categories / admin) is always
  combined with the search filter on the server.
- **Rationale**: Meets FR-013c and SC-003a at 100k tickets with no extra search service.
- **Alternatives considered**: Regex `contains` search (cannot use indexes, slow at scale); Atlas
  Search or Elasticsearch (extra infrastructure not justified for v1).

## R11. Account emails

*(Ticket-update notifications — new ticket, replies, customer comments, status changes,
reassignment — were removed 2026-11-04 by owner decision to keep the app simple. Only account
emails remain: email verification, password reset, invitation.)*

- **Decision** (owner-specified, 2026-11-03): **Send immediately.** `Services/Email/EmailService`
  builds each account email and sends it via SMTP with **MailKit** through `IEmailSender` right after the
  triggering change is saved. Any exception is caught and logged with `LogError` (recipient id and
  email type — no body), and the action still succeeds. No queue, no background job, no retries;
  account emails can be requested again from the UI ("Didn't get it? Send again"). Local development sends through
  **Gmail SMTP** (`smtp.gmail.com:587`, STARTTLS, app password from user secrets), so emails reach
  real inboxes; test accounts use Gmail plus-addresses (`<you>+basma@gmail.com`).
- **Rationale**: Simplest working design for a POC: no extra collection, model, enum, settings,
  or hosted service. Emails arrive within seconds.
- **Risk accepted**: each emailing request takes ~1–3 s longer (SMTP round trip); an account
  email that fails is lost (logged only) until the user clicks "Send again".
- **Alternatives considered**: Queued-email collection + background job with retries (removed by
  owner, constitution v5.0.0); transactional outbox (needs transactions); a message broker (extra
  infrastructure); `System.Net.Mail.SmtpClient` (Microsoft recommends MailKit instead).

## R12. Closing Resolved tickets

- **Decision** (owner-specified, 2026-11-02): Closing is manual only. The assigned agent or an admin
  moves a ticket Resolved → Closed through the normal status endpoint; there is no auto-close job.
  A Resolved ticket nobody closes stays Resolved.
- **Rationale**: Owner decision; needs no background job or configuration while keeping the
  Closed status.
- **Alternatives considered**: Auto-close Resolved tickets after 7 days (removed by owner).

## R13. Validation and error format

- **Decision**: Request shape (required, length, enum values) is validated with built-in **data
  annotations** on DTOs; `[ApiController]` returns 400 automatically, customized to the standard error body
  with `code: validation_failed`. Business validation (category active, agent eligible, allowed
  transition, permissions) lives in services, which throw `AppException(status, code, message,
  extensions?)`. One `ApiExceptionHandler` (built-in `IExceptionHandler`) converts `AppException`
  to a simple `{ code, message }` body (plus fields such as `errors` or `allowedNext`), and any other
  exception to a 500 `server_error` without internal details. Owner decision (2026-11-03): RFC 9457
  Problem Details was replaced by this simpler shape.
- **Rationale**: Uses only framework features (Principle IV); one place produces every error
  response (Principle III); easy to follow when reading a service top to bottom.
- **Alternatives considered**: RFC 9457 Problem Details (standard, but more fields than the client
  needs; replaced 2026-11-03); FluentValidation (extra library; removed by constitution v3.0.0);
  `Result<T>` return types (more ceremony in every service and controller method).

## R14. Front end

- **Decision** (owner-specified): **React 19 in JavaScript** (JSX, no TypeScript) built with
  **Vite**, in `client/`. Libraries: React Router (routing and role-guarded routes), **axios**
  (HTTP), React Hook Form (form state and client-side validation), **Tailwind CSS 4** via the
  `@tailwindcss/vite` plugin (styling, no component library).
  - One axios instance (`src/api/client.js`): `baseURL: "/api/v1"`, `withCredentials: true`. A response interceptor turns the error body
    into a plain error object `{ status, code, message, errors }` and redirects to `/login` on 401.
  - Server data is loaded in components through a small `useApi` hook that tracks
    `data / loading / error` and exposes `reload()`; after a mutation the page reloads the data it
    shows.
  - Shared Tailwind UI pieces (button, input, table, badge, modal, toast) live in
    `src/components/`.
  - **Responsive, rem-only styling** (owner-specified): mobile-first layouts using Tailwind's
    rem-based breakpoints; tables switch to stacked cards below `md` (48rem); the nav collapses to a
    menu button below `md`. All lengths are `rem` — `px` is banned in `client/` source, Tailwind
    arbitrary values, and inline styles. Tailwind's default 1px border-style widths are overridden
    to `0.0625rem` in `index.css`. A small Node script (`client/scripts/check-no-px.js`) run by
    `npm run lint` enforces the rule.
  - Why rem: sizes scale with the user's browser font-size setting, which improves accessibility,
    and one unit everywhere keeps the design consistent.
- **Rationale**: Matches the team's preference; the app's data needs (lists, one detail page, a dashboard) are simple
  enough that hand-managed loading state is acceptable.
- **Alternatives considered**: TypeScript (rejected by owner); TanStack Query (rejected by owner);
  MUI (replaced by Tailwind per owner); Next.js (server rendering not needed).

## R15. Testing

- **Decision** (owner-specified): **No automated tests in v1**, back end or front end. Each user
  story is verified manually with the scenarios in [quickstart.md](quickstart.md), including the
  security spot checks. The client runs ESLint.
- **Rationale**: Owner decision to reduce v1 scope; constitution amended to v2.0.0 to match.
- **Risk accepted**: Permission rules (who can see/change which ticket), and status transitions
  are not protected against regressions. Mitigation: these rules are concentrated in
  `Helpers/Tickets/TicketRules` so tests can be added later in one place.
- **Alternatives considered**: xUnit + Testcontainers back-end tests and Vitest front-end tests
  (deferred).

## R16. Dashboard counts

- **Decision**: One MongoDB aggregation with `$match` on the optional created-date range followed
  by `$facet` (counts by status and by priority). Computed on request, no caching.
- **Rationale**: Exact counts at view time (SC-008); indexed on `createdAt`, fast at 100k tickets.
- **Alternatives considered**: Pre-computed counters (risk of drift, violates SC-008).

## R17. Initial admin and local setup

- **Decision**: On startup, `Services/AdminSeeder` creates an Admin from configuration if none
  exists (`Seed:AdminEmail`, `Seed:AdminPassword` via user secrets or environment variables).
  Development uses no Docker: MongoDB is a **MongoDB Atlas** cluster and email goes through Gmail;
  their connection settings are user secrets (`Mongo:*`, `Smtp:*`).
- **Rationale**: Meets the assumption "one admin account is created during initial setup" without
  committing credentials (Principle II).
- **Alternatives considered**: A manual database script (error-prone, easy to forget).
