# Feature Specification: Support Ticket System

**Feature Branch**: `001-support-ticket-system`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "A web-based support ticket system. Customers can register, log in, submit tickets (title, description, category, priority, attachments), see the status of their tickets, and add comments. Support agents can see the tickets assigned to them, change status (Open → In Progress → Resolved → Closed), reply to customers, and reassign tickets. Admins manage users, roles, categories, and see a dashboard with ticket counts by status and priority. Users get email notifications when their ticket is updated. using react, .net and nosql"

## Clarifications

### Session 2026-10-29

- Q: Should agents be able to write internal notes visible only to agents and admins? → A: No. Every message on a ticket is visible to the customer.
- Q: Which languages must the website support at launch? → A: English only.
- Q: Should agents see only their assigned tickets or every ticket? → A: Agents belong to one or more categories; they see (read-only) all tickets in their categories and can only reply or change status on tickets assigned to them.
- Q: Should users be able to search tickets by keyword or ticket number? → A: Yes. Search by ticket number or keyword in title/description, limited to tickets the user may see (customers: own; agents: their categories; admins: all).
- Q (2026-11-03): Do tickets need a separate human-readable number? → A: No. Tickets are identified by their database Id everywhere (URLs, emails, search). This supersedes the ticket-number parts of earlier answers.
- Q: Who moves a ticket from Resolved to Closed? → A: The system closes it automatically 7 days after it was Resolved.
- Q (2026-11-02, supersedes the previous answer): Is there an automatic close? → A: No. The assigned agent or an admin closes a Resolved ticket manually (Resolved → Closed); if nobody closes it, it stays Resolved.

### Session 2026-11-02

- Q: Which "simple structure" should the project follow instead of the current layered, multi-project setup? → A: One .NET project (`API`) with plain folders (`Controllers/`, `Models/`, `DTOs/`, `Services/`, `Data/`, `BackgroundJobs/`) plus `client/` for React; the `Domain`, `Application`, `Persistence`, and planned `Infrastructure` projects are removed, along with Unit of Work, replica-set transactions, transactional outbox, and FluentValidation. Email retries use a simple queued-email collection processed by a background job. (Superseded 2026-11-03: emails are sent immediately with no queue, job, or retries; see FR-024.)
- Q: Should the app track ticket history and protect against two people editing the same ticket at once? → A: No. The goal is a simple app that shows CRUD operations: there is no audit history and no edit-conflict check; the last save wins.
- Q: Can users or categories be deactivated or deleted? → A: Users are never deactivated or deleted. Categories can be deleted with a soft delete (a "deleted" flag): they disappear from every picker and list but existing tickets keep showing their category name.
- Q: Can a ticket be unassigned? → A: No. Every category MUST have a default agent, so every new ticket is assigned on creation. Because nothing is ever unassigned, there is no "take" action and no unassigned list.
- Q: What happens when an agent sees that a ticket's description belongs to another area? → A: The agent reassigns it to any agent in any category; the ticket's category changes to the category chosen for the new agent (one the new agent belongs to).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer submits and tracks a ticket (Priority: P1)

A customer creates an account, signs in, and submits a support ticket describing their problem with a title, description, category, and priority. They can then see a list of their tickets with the current status of each, open any ticket to view its conversation, and add comments.

**Why this priority**: Without the ability to submit and track tickets there is no product. This story alone delivers a usable "contact support" channel even before agent tooling exists.

**Independent Test**: Register a new customer account, submit a ticket, confirm it appears in "My Tickets" with status Open, open it, and add a comment.

**Acceptance Scenarios**:

1. **Given** a visitor without an account, **When** they register with name, email, and password and verify their email, **Then** they can sign in and reach their ticket list.
2. **Given** a signed-in customer, **When** they submit a ticket with title, description, category, and priority, **Then** the ticket is saved with status Open, receives a unique Id, and appears at the top of their ticket list.
3. **Given** a signed-in customer, **When** they submit a ticket missing a title, description, or category, **Then** the ticket is not created and the missing fields are clearly indicated.
4. **Given** a customer viewing one of their tickets, **When** they add a comment, **Then** the comment appears in the ticket's conversation with their name and timestamp.
5. **Given** a signed-in customer, **When** they try to open a ticket belonging to another customer, **Then** access is denied.

---

### User Story 2 - Agent works assigned tickets (Priority: P1)

A support agent signs in and sees the tickets assigned to them. They open a ticket, read the description, reply to the customer, move the ticket through its statuses (Open → In Progress → Resolved → Closed), and reassign it to another agent — in any category — when the description shows it belongs to a different area.

**Why this priority**: Tickets are only useful if someone responds to them. Together with Story 1 this forms the minimum viable support loop.

**Independent Test**: With a seeded agent account and an assigned ticket, sign in as the agent, reply to the customer, move the ticket to In Progress then Resolved, and reassign a second ticket to another agent.

**Acceptance Scenarios**:

1. **Given** a signed-in agent, **When** they open their queue, **Then** they see only tickets currently assigned to them, filterable by status and priority and sortable by creation date and priority.
2. **Given** an agent viewing an assigned ticket, **When** they post a reply, **Then** the reply appears in the ticket conversation.
3. **Given** a ticket in status Open, **When** the assigned agent changes it to In Progress, **Then** the ticket shows the new status.
4. **Given** a Resolved ticket, **When** the assigned agent changes it to Closed, **Then** the ticket becomes Closed. The system never closes a ticket automatically.
5. **Given** an agent attempting an invalid transition (e.g., Open → Closed), **When** they submit the change, **Then** the system rejects it and explains the allowed next statuses.
6. **Given** an agent viewing an assigned ticket whose description belongs to another area, **When** they reassign it to an agent of another category and choose that category, **Then** the ticket's category and assigned agent both change, it disappears from their queue, and it appears in the new agent's queue.
7. **Given** an agent viewing an assigned ticket, **When** they reassign it to another agent of the same category, **Then** only the assigned agent changes.
8. **Given** a newly submitted ticket, **When** it is created, **Then** it is automatically assigned to its category's default agent (every category has one, so no ticket is ever unassigned).
9. **Given** an agent who belongs to a category, **When** they open the category view, **Then** they see all tickets in that category (read-only for tickets not assigned to them) and cannot see tickets in categories they do not belong to.
10. **Given** an agent viewing a ticket in their category that is assigned to someone else, **When** they try to reply or change its status, **Then** the action is not available.

---

### User Story 3 - *(Removed 2026-11-04: ticket-update notifications dropped to keep the app simple.)*

---

### User Story 4 - Admin manages users, roles, and categories (Priority: P2)

An administrator creates and edits user accounts, assigns roles (Customer, Agent, Admin), and maintains the list of ticket categories that customers choose from (create, list, edit, soft delete). Users are never deactivated or deleted.

**Why this priority**: Required to onboard agents and keep categories meaningful, but can be seeded manually for an initial release.

**Independent Test**: Sign in as admin, create an agent account, change a customer to an agent, create a category with a default agent, rename it, and delete it; verify each change takes effect for the affected users.

**Acceptance Scenarios**:

1. **Given** a signed-in admin, **When** they create a user with a role of Agent, **Then** the agent receives an invitation email to set their password and can sign in.
2. **Given** a signed-in admin, **When** they create a category, **Then** they MUST choose its default agent (that agent is added to the category), and the category becomes selectable on the ticket submission form.
3. **Given** a category in use by existing tickets, **When** the admin deletes it, **Then** it is marked deleted, is no longer offered anywhere, and existing tickets keep showing its name.
4. **Given** an agent who is a category's default agent, **When** the admin tries to remove them from that category or change their role, **Then** the change is rejected until another default agent is chosen.
5. **Given** a non-admin user, **When** they try to reach any admin page or action, **Then** access is denied.

---

### User Story 5 - Admin views ticket dashboard (Priority: P3)

An administrator sees a dashboard summarizing ticket volumes: counts by status and by priority.

**Why this priority**: Valuable for oversight, but the system is fully usable without it.

**Independent Test**: Seed tickets in varied statuses and priorities, sign in as admin, and confirm the dashboard counts match the seeded data.

**Acceptance Scenarios**:

1. **Given** existing tickets, **When** an admin opens the dashboard, **Then** they see the count of tickets in each status (Open, In Progress, Resolved, Closed) and each priority (Low, Medium, High, Urgent).
2. **Given** the dashboard is open, **When** the admin selects a count, **Then** they see the list of tickets behind that number.
3. **Given** the admin selects a date range, **When** the dashboard refreshes, **Then** counts reflect only tickets created within that range.

---

### Edge Cases

- A customer registers with an email that already has an account → registration is refused with a message offering password reset, without revealing account details.
- Two people change the same ticket at the same time → the last save wins; there is no conflict check (accepted for simplicity).
- A customer tries to comment on a Resolved or Closed ticket → commenting is disabled; the ticket is read-only and the customer is offered a link to submit a new ticket that references the original ticket.
- An agent reassigns a ticket and picks a category the target agent does not belong to → the reassignment is rejected.
- A user forgets their password → they can request a reset link by email, valid for 1 hour.
- Repeated failed sign-in attempts → each one is simply refused with an "email or password is incorrect" message; accounts are never locked and attempts are not limited (accepted to keep the first version simple).
- A category is deleted while a customer has the submission form open → submission with that category is rejected and the customer is asked to choose another.
- A category is deleted while it still has open tickets → the tickets stay assigned to their agents and keep the category name; agents can reassign them to another category.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts & access**

- **FR-001**: System MUST allow visitors to register as customers using name, email, and password.
- **FR-002**: System MUST verify a customer's email address before allowing them to submit tickets.
- **FR-003**: System MUST allow users to sign in with email and password and to sign out.
- **FR-004**: System MUST allow users to reset a forgotten password through an emailed, time-limited link.
- **FR-005**: System MUST support three roles — Customer, Agent, Admin — and restrict every page and action to the roles permitted to use it.
- **FR-006**: *(Removed 2026-11-02: users are never deactivated.)*

**Tickets (customer)**

- **FR-007**: Customers MUST be able to submit a ticket with a required title (max 150 characters), required description (max 5,000 characters), required category, and priority (Low, Medium, High, Urgent; default Medium).
- **FR-008**: *(Removed 2026-11-04: attachments dropped to keep the app simple.)*
- **FR-009**: System MUST give every ticket a unique identifier (its database Id), shown on the ticket and used in links and search.
- **FR-010**: Customers MUST be able to list their own tickets with status, priority, category, and last-updated date, and filter by status.
- **FR-011**: Customers MUST be able to view the full conversation and current status of their own tickets, and MUST NOT be able to view other customers' tickets.
- **FR-012**: Customers MUST be able to add comments to their own tickets while the ticket is Open or In Progress.

**Tickets (agent)**

- **FR-013**: Agents MUST be able to view a queue of tickets assigned to them, filter by status and priority, and sort by creation date and priority.
- **FR-013a**: Agents MUST be able to view, read-only, all tickets in the categories they belong to, and MUST NOT see tickets in other categories.
- **FR-013b**: *(Removed 2026-11-02: tickets are never unassigned, so there is nothing to take.)*
- **FR-013c**: All users MUST be able to search tickets by exact ticket Id or by keyword in title and description; results MUST include only tickets the user is allowed to see (customers: their own; agents: their categories; admins: all).
- **FR-014**: Agents MUST be able to reply to customers and change status only on tickets assigned to them. Every reply and comment on a ticket is visible to the ticket's customer; there are no internal (agent-only) notes.
- **FR-015**: System MUST enforce the status lifecycle Open → In Progress → Resolved → Closed, allowing only forward transitions to the next status; tickets are never reopened. Only the assigned agent or an admin moves a ticket from Resolved to Closed; there is no automatic closing.
- **FR-016**: Agents MUST be able to reassign a ticket assigned to them to any other agent in any category, for example when the description shows the ticket belongs to another area. The agent chooses the target agent and one of that agent's (non-deleted) categories; the ticket's category becomes that category. Reassigning within the same category leaves the category unchanged.
- **FR-017**: System MUST automatically assign each new ticket to the default agent of its category. Every category MUST have a default agent, so a ticket is never unassigned.
- **FR-018**: System MUST make Resolved and Closed tickets read-only (no comments or replies from anyone) and MUST offer the customer a way to submit a new ticket that references the original ticket.
- **FR-019**: Agents MUST be able to change a ticket's priority after reviewing it. The category changes only through reassignment (FR-016).
- **FR-020**: *(Removed 2026-11-02: no ticket history is recorded.)*

**Account emails**

- **FR-021**: *(Removed 2026-11-04: ticket-update notifications dropped to keep the app simple.)*
- **FR-022**: *(Removed 2026-11-04: ticket-update notifications dropped to keep the app simple.)*
- **FR-023**: *(Removed 2026-11-04: ticket-update notifications dropped to keep the app simple.)*
- **FR-024**: Account emails (email verification, password reset, invitation) MUST be sent immediately when the triggering action is saved. Failure to send MUST NOT block or fail the action and MUST be logged; there is no automatic retry. Wherever a user waits for an account email (email verification, password reset, invitation), the page MUST offer "Didn't get it? Send again".

**Administration**

- **FR-025**: Admins MUST be able to create, list, and edit users (name, role, categories). Users MUST NOT be deactivated or deleted. An agent who is a category's default agent MUST NOT lose the Agent role or leave that category until another default agent is set.
- **FR-026**: Admins MUST be able to create, list, rename, and delete ticket categories, assign agents to one or more categories, and set or change each category's default agent. A category MUST always have a default agent who belongs to it; choosing a default agent adds that agent to the category. Deleting is a soft delete (a deleted flag): deleted categories are hidden from all pickers and lists, and existing tickets keep showing the category name.
- **FR-027**: Admins MUST be able to view and reassign any ticket (same rules as FR-016).
- **FR-028**: Admins MUST have a dashboard showing ticket counts by status and by priority, filterable by creation date range, with drill-down to the underlying ticket list.

**Responsive layout**

- **FR-029**: Every page MUST adapt to phone, tablet, and desktop screens: content fits the screen width without horizontal scrolling, lists remain readable on narrow screens, navigation stays reachable, and buttons are large enough to tap.

### Key Entities

- **User**: A person who signs in. Attributes: name, email (unique), role (Customer, Agent, Admin), categories (agents only; one or more), email-verified flag, created date. Users are never deactivated or deleted.
- **Ticket**: A support request raised by a customer. Attributes: Id (unique), title, description, category, priority, status, customer (creator), assigned agent (always set), related ticket (optional, the earlier ticket this one follows up), created and last-updated dates.
- **Comment**: A message within a ticket's conversation. Attributes: ticket, author, author role, text, created date.
- **Category**: A classification for tickets managed by admins. Attributes: name (unique), agents (the agents who belong to it), default agent (required, must be an agent of this category), deleted flag (soft delete).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new customer can register, verify their email, and submit their first ticket in under 5 minutes.
- **SC-002**: A returning customer can submit a ticket in under 2 minutes.
- **SC-003**: Ticket lists and ticket detail pages load in under 2 seconds for 95% of requests with up to 100,000 stored tickets.
- **SC-003a**: Ticket search returns results in under 2 seconds for 95% of searches with up to 100,000 stored tickets, and never returns a ticket the user is not allowed to see.
- **SC-004**: The system supports at least 500 concurrent signed-in users without noticeable slowdown.
- **SC-005**: *(Removed 2026-11-04: ticket-update notifications dropped to keep the app simple.)*
- **SC-006**: *(Removed 2026-11-02 with ticket history.)*
- **SC-007**: No user can view or modify a ticket outside their permissions (verified by role-based access tests covering every page and action).
- **SC-008**: Dashboard counts match the actual ticket data exactly at the time of viewing.
- **SC-009**: 90% of first-time agents can find, reply to, and update the status of an assigned ticket without guidance.
- **SC-010**: Every primary task (register, submit a ticket, reply, change status, use the dashboard) can be completed on a 320-pixel-wide phone screen without horizontal scrolling or zooming.

## Assumptions

- The project's primary purpose is learning .NET: the back end is built one file at a time, with an explanation of why each file exists (constitution Principle V).
- The back end follows a simple structure (confirmed 2026-11-02): a single .NET project organized by plain folders (controllers, models, DTOs, services, data access), not separate layered projects. Business rules still live in services, not controllers. Emails are sent immediately during the action, without a queue or background job (FR-024).
- Only customers self-register; agent and admin accounts are created by an admin.
- One admin account is created during initial setup.
- Customers choose the initial priority; agents and admins may adjust it.
- Email and password is the only sign-in method for v1; single sign-on and social login are out of scope.
- The interface and all account emails are in English only for v1 (confirmed); other languages and right-to-left layouts are out of scope. The interface works on current desktop and mobile web browsers; native mobile apps are out of scope.
- Customers cannot delete tickets or comments; users are never deactivated or deleted, and deleted categories are only flagged, so ticket data is always retained.
- The app is intentionally simple to demonstrate CRUD operations: no audit history and no concurrent-edit protection (last save wins).
- Service-level targets (response/resolution deadlines), live chat, knowledge base, and creating tickets from inbound email are out of scope for v1.
- An external email delivery service is available for sending account emails (verification, password reset, invitation).
- Ticket data is retained indefinitely for v1.
- File attachments were removed on 2026-11-04 (owner decision, to keep the app simple); tickets and comments are text only.
- Ticket-update email notifications (User Story 3) were removed on 2026-11-04 (owner decision, to keep the app simple); users see ticket changes in the app. Only account emails are sent.
- Apart from the project structure above, technology choices stated in the request (web front end, .NET back end, NoSQL document database) are carried into the planning phase and intentionally not part of this specification.
