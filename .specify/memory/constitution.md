<!--
Sync Impact Report
- Version change: 4.0.0 → 5.0.0 (MAJOR: email queue + retry constraint removed)
- Modified principles:
  - I. Simple Single-Project Structure: `BackgroundJobs/` is used only when a feature needs a
    hosted service (none in v1)
- Modified sections:
  - Technology Stack & Constraints → Email: sent immediately during the user's action; a failed
    send is logged and never fails the action; no queue, no background job, no retries
- Templates requiring updates: none
- Follow-up TODOs: none — specs/001-support-ticket-system updated in the same change

Previous report (4.0.0)
- Version change: 3.0.0 → 4.0.0 (MAJOR: Principle IV rule removed; Concurrency constraint removed)
- Modified principles:
  - IV. Simplicity & Observability: removed "every ticket state change MUST produce a ticket
    history entry"; added that v1 is a simple CRUD app without audit history or edit-conflict
    checks
  - I. Simple Single-Project Structure: BackgroundJobs example no longer mentions auto-closing
- Modified sections:
  - Technology Stack & Constraints: removed the Concurrency (lost-update protection) rule; database
    may be a hosted MongoDB (Atlas); configuration also comes from user secrets in development
- Added/removed sections: none
- Templates requiring updates: none (templates read the constitution at runtime)
- Follow-up TODOs: none — specs/001-support-ticket-system updated in the same change
- Previous amendments: 3.0.0 (Principle I redefined: single `API` project with folders);
  2.2.0 (front-end styling rules: mobile-first, rem only, no px)
- Implementation note: placeholder `Domain`, `Application`, `Persistence` projects still exist on
  disk; tasks T005–T007 remove them
-->

# TicketSystem Constitution

## Core Principles

### I. Simple Single-Project Structure

The back end MUST be a single ASP.NET Core project, `API`, organized by plain folders:

- **Controllers/** — thin HTTP layer: routing, authentication attributes, request/response
  mapping. Controllers MUST NOT contain business logic and MUST NOT use `Data/` directly; they
  call services.
- **Models/** — entities and enums stored in the database.
- **DTOs/** — request and response shapes sent over HTTP.
- **Services/** — business rules and use cases (ticket lifecycle, assignment, visibility,
  validation). Every business rule MUST live here.
- **Data/** — MongoDB context: client, database, typed collections, and index creation.
- **BackgroundJobs/** — hosted services, created only when a feature needs one (none in v1).
  Jobs MUST call services for any business rule rather than duplicate it.

Additional .NET projects (class libraries, separate infrastructure projects) MUST NOT be added
without an amendment to this principle.

The React client lives in `client/` and MUST NOT re-implement business rules; it may mirror them
only for user feedback, with the server remaining the source of truth.

Rationale: one project with obvious folders is easiest to learn and navigate; keeping rules in
services and out of controllers still gives each concern a single home.

### II. Security & Role-Based Access (NON-NEGOTIABLE)

- Every endpoint MUST require authentication except registration, sign-in, email verification,
  and password reset.
- Authorization MUST be enforced on the server for every action, at both role level (Customer,
  Agent, Admin) and record level (a customer's own tickets; an agent's categories and assigned
  tickets). Hiding a button in the UI is never sufficient.
- Passwords MUST be stored only as salted hashes using a vetted algorithm; tokens and reset
  links MUST expire.
- Secrets (connection strings, signing keys, email credentials) MUST NOT be committed; they come
  from environment variables or a secret store.
- All input MUST be validated server-side. File uploads MUST be checked for size, type, and count
  before being stored, and MUST NOT be served from a path that allows execution.
- Sensitive data (passwords, tokens, full attachment contents) MUST NOT be written to logs.

Rationale: the system stores customer communications and attachments; a single access-control
gap exposes other customers' data.

### III. Consistent API Contracts

- The API MUST be RESTful over JSON and documented via an OpenAPI description generated from the
  code.
- Requests and responses MUST use DTOs from `DTOs/`; models and database documents MUST NOT be
  returned directly.
- Errors MUST use a single format (RFC 9457 Problem Details) with stable, documented error codes.
- Every list endpoint MUST be paginated and MUST apply the caller's visibility rules on the
  server.
- Breaking changes to an endpoint MUST be versioned rather than silently changed.

Rationale: a predictable contract lets the React client and tests be built in parallel and
changed safely.

### IV. Simplicity & Observability

- Build only what the current spec requires (YAGNI). New libraries, services, or patterns
  MUST be justified in the plan's complexity tracking.
- Prefer the framework's built-in capabilities over custom infrastructure. The following are
  not used unless a future amendment allows them: Unit of Work, multi-document database
  transactions (and the replica set they need), transactional outbox, FluentValidation, and
  additional .NET projects. Validation uses built-in data annotations plus explicit checks in
  services.
- The back end MUST emit structured logs with a correlation id per request, and MUST log every
  failed authorization and every failed notification attempt.
- v1 is a deliberately simple CRUD application: there is no ticket audit history and no
  concurrent-edit protection (last save wins). Adding either requires a spec change.

Rationale: a small team can only maintain what it understands; structured logs make production
issues diagnosable without extra audit machinery.

### V. Learning-First Implementation

This project exists to learn .NET. The back end is built so every file can be understood on its
own.

- Every .NET task in `tasks.md` MUST create or change exactly **one file**, named by its path, and
  MUST include a **Why** that explains the file's purpose and where it sits in the folder
  structure.
- .NET work MUST be implemented one file at a time, in task order. After each .NET file is
  written, the implementer MUST explain it: what the file does, the .NET concepts it uses
  (e.g., dependency injection, `async`/`await`, records, options pattern, middleware), and how it
  connects to the files before and after it.
- .NET code MUST carry short comments on non-obvious framework concepts (why a pattern is used),
  not line-by-line narration.
- Front-end (React) tasks are exempt from the one-file rule but SHOULD still state their purpose.

Rationale: small, explained steps turn the codebase into a guided tour of ASP.NET Core and
MongoDB access.

## Technology Stack & Constraints

- **Back end**: .NET 10 (C#) with nullable reference types enabled, ASP.NET Core Web API, in the
  single `API` project described in Principle I.
- **Front end**: React single-page application written in JavaScript, styled with Tailwind CSS,
  calling the back end with axios, kept in `client/` in this repository and talking to the
  back end only through the documented API.
- **Front-end styling**:
  - Every screen MUST be responsive and built mobile-first: usable from a 20rem-wide viewport up
    to large desktops, with no horizontal page scrolling. Tables become stacked cards and
    navigation collapses into a menu on small screens.
  - All CSS lengths (sizes, spacing, font sizes, breakpoints, borders, shadows, radii) MUST use
    `rem` (or `%`, `vw`/`vh`, `fr`, unitless line-heights where those are the right tool).
    `px` MUST NOT appear in front-end source: not in CSS, Tailwind arbitrary values
    (e.g., `w-[300px]`), inline styles, or theme variables.
  - Touch targets MUST be at least 2.75rem tall.
- **Database**: MongoDB (local single instance or hosted, e.g. MongoDB Atlas; no transactions
  are used, so no replica set is required). Collections and their
  indexes MUST be defined in code in `Data/`; data shapes MUST be designed around the
  application's read patterns (e.g., ticket list, ticket detail, dashboard counts).
- **Async I/O**: all database, file, and email operations MUST be asynchronous.
- **Email**: sent through an external email service behind an interface in `Services/`, right
  after the change it reports is saved. A failed send MUST be logged and MUST NOT fail the user's
  action; there is no queue or automatic retry, and users can ask again for account emails
  (verification, password reset).
- **Configuration**: environment-specific settings via `appsettings.{Environment}.json` plus
  environment variables (and .NET user secrets in development); no environment-specific values
  hard-coded.

## Development Workflow & Quality Gates

- Features follow the Spec Kit flow: specify → clarify → plan → tasks → implement. Code is
  written only against an approved `tasks.md`, whose .NET tasks follow Principle V (one file per
  task, each with a Why).
- Every plan MUST pass a Constitution Check against these principles before tasks are generated;
  any deviation MUST be recorded and justified in the plan's complexity tracking.
- Every change MUST be reviewed by at least one other person before merge, and the reviewer
  MUST confirm compliance with Principles I–II.
- Merge gates: the solution builds without errors or new compiler warnings, the front end builds
  and passes lint (including the no-`px` check), and the affected scenarios in the feature's
  `quickstart.md` were checked manually. Automated tests are not required in v1.

## Governance

This constitution takes precedence over other project practices and conventions. When a guide or
habit conflicts with it, the constitution wins until it is amended.

- **Amendments**: proposed as a change to this file with a written rationale, reviewed and
  approved by the project maintainers, and accompanied by an updated Sync Impact Report and any
  migration steps for existing code.
- **Versioning**: semantic versioning. MAJOR for removing or redefining a principle; MINOR for
  adding a principle or section or materially expanding guidance; PATCH for clarifications and
  wording.
- **Compliance review**: every plan's Constitution Check and every code review verifies
  compliance. Unjustified complexity or violations block the merge.

**Version**: 5.0.0 | **Ratified**: 2026-10-29 | **Last Amended**: 2026-11-03
