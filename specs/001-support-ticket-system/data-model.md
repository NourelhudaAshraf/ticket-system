# Data Model: Support Ticket System

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-02 (revised
for constitution v4.0.0: no history, no version field, no deactivation)

Storage is MongoDB (Atlas in development; no transactions) (see [research.md](research.md) R2–R5). Classes in
`API/Models/` mirror these documents and carry their own BSON attributes; collections and indexes
are defined in `API/Data/`. All ids are `ObjectId` exposed to the API as 24-character strings. All
timestamps are UTC. Enums are stored as strings.

**References, not copies**: documents store only the ids of related documents. When a response
needs names, the service collects the ids from the page of results and loads the related users
and categories with one `$in` query per collection (the equivalent of Mongoose `populate`). A
rename therefore shows everywhere immediately.

## Enums

| Enum | Values |
|------|--------|
| `UserRole` | `Customer`, `Agent`, `Admin` |
| `TicketStatus` | `Open`, `InProgress`, `Resolved`, `Closed` |
| `TicketPriority` | `Low`, `Medium`, `High`, `Urgent` (stored with `priorityRank` 1–4 for sorting) |

## Collection `users` — User

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | required, 1–100 chars |
| `email` | string | required, valid email, stored lower-cased, **unique** |
| `passwordHash` | string? | null until an invited user sets a password |
| `role` | UserRole | required |
| `categoryIds` | ObjectId[] | Agents only (zero or more; choosing an agent as a category's default adds that category); MUST be empty for Customer and Admin |
| `emailVerified` | bool | customers must be verified to submit tickets (FR-002); admin-created users are verified when they set their password |
| `emailVerificationTokenHash` / `emailVerificationExpiresAt` | string? / date? | 24 h, single-use |
| `passwordResetTokenHash` / `passwordResetExpiresAt` | string? / date? | 1 h for reset, 72 h for invitation, single-use |
| `createdAt`, `updatedAt` | date | |

**Indexes**: `{email: 1}` unique · `{role: 1}` · `{categoryIds: 1}`

Users are never deactivated or deleted (FR-025). An agent who is any category's `defaultAgentId`
cannot lose the Agent role or be removed from that category (`agent_is_default`, 422).

## Collection `categories` — Category

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | |
| `name` | string | required, 1–60 chars |
| `nameNormalized` | string | lower-cased trimmed name, **unique** |
| `defaultAgentId` | ObjectId | **required**; MUST be an Agent; saving the category adds it to that agent's `categoryIds` |
| `isDeleted` | bool | soft delete, default `false`; deleted categories are hidden from every picker and list, existing tickets still show its name (looked up by id, including deleted categories) |
| `createdAt`, `updatedAt` | date | |

The agents of a category are the users with `role = Agent` and the category in `categoryIds`
(single source of truth on the user). An agent cannot be removed from a category that names them as
default agent; the admin changes the default agent first.

**Indexes**: `{nameNormalized: 1}` unique (deleted categories keep their name, so a new category
cannot reuse it)

## Collection `tickets` — Ticket

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | |
| `title` | string | required, 1–150 chars |
| `description` | string | required, 1–5,000 chars |
| `categoryId` | ObjectId | category must not be deleted at creation or reassignment |
| `priority` / `priorityRank` | TicketPriority / int | default `Medium` |
| `status` | TicketStatus | starts `Open` |
| `customerId` | ObjectId | creator |
| `assignedAgentId` | ObjectId | always set: the category's default agent on create, then whoever it is reassigned to |
| `relatedTicketId` | ObjectId? | optional follow-up reference; MUST be a ticket owned by the same customer |
| `createdAt`, `updatedAt` | date | `updatedAt` changes on any comment or field change |
| `resolvedAt`, `closedAt` | date? | set on entering the status |

**Indexes**:
- `{customerId: 1, updatedAt: -1}` — customer list
- `{assignedAgentId: 1, status: 1, priorityRank: -1, createdAt: -1}` — agent queue
- `{categoryId: 1, status: 1, createdAt: -1}` — category view
- `{createdAt: 1}` — dashboard date range
- text index `{title: "text", description: "text"}` with weights title 3, description 1

### Ticket lifecycle

```text
Open ──► InProgress ──► Resolved ──► Closed   (every step manual; no auto-close)
```

| From → To | Who | Side effects |
|-----------|-----|--------------|
| Open → InProgress | assigned agent, admin | — |
| InProgress → Resolved | assigned agent, admin | `resolvedAt = now` |
| Resolved → Closed | assigned agent, admin | `closedAt = now` |
| any other | — | rejected: `invalid_transition` (422) with allowed next status |

- Comments and replies are allowed only in `Open` and `InProgress` (FR-012, FR-018).
- Tickets are never reopened, and nothing closes a ticket automatically (FR-015).
- Assignment on create: always the category's `defaultAgentId` (FR-017).
- Saves are plain updates with no version check: the last save wins.

### Who can do what on a ticket

| Action | Customer | Agent | Admin |
|--------|----------|-------|-------|
| View | own tickets | tickets in their categories, plus any ticket assigned to them | all |
| Comment / reply | own, Open/InProgress | assigned to them, Open/InProgress | all, Open/InProgress |
| Change status | — | assigned to them | all |
| Change priority | — | assigned to them | all |
| Reassign (sets agent + category) | — | assigned to them, to any agent + one of that agent's non-deleted categories | all, same rule |
## Collection `ticketComments` — Comment

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | |
| `ticketId` | ObjectId | |
| `authorId` | ObjectId | name and role are looked up from `users` |
| `body` | string | required, 1–5,000 chars |
| `createdAt` | date | |

All comments are visible to the ticket's customer (no internal notes).

**Indexes**: `{ticketId: 1, createdAt: 1}`

A comment is inserted first; the ticket's `updatedAt` is then bumped. If the second write fails,
only the "last updated" date is stale.

*(File attachments were removed 2026-11-04 by owner decision to keep the app simple: tickets and
comments hold text only.)*
