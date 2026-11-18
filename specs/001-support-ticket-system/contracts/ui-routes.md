# UI Routes Contract: Support Ticket System

**Feature**: [../spec.md](../spec.md) | **API**: [rest-api.md](rest-api.md)

React client routes and the roles allowed on each. Route guards are for navigation only; the API
enforces all permissions (constitution Principle II). Signed-out users hitting a protected route
are sent to `/login`; after signing in, everyone lands on their role home page (`/`), and signed-in users opening `/login`, `/register`, or `/forgot-password` are sent there too. Signed-in users without the role see a "Not allowed" page.

| Route | Roles | Purpose | Main API calls |
|-------|-------|---------|----------------|
| `/login` | Public | Sign in | `POST /auth/login` |
| `/register` | Public | Customer registration | `POST /auth/register` |
| `/verify-email?userId&token` | Public | Confirm email | `POST /auth/verify-email` |
| `/forgot-password` | Public | Request reset link | `POST /auth/forgot-password` |
| `/reset-password?userId&token` | Public | Set new password / accept invitation | `POST /auth/reset-password` |
| `/` | any | Redirects by role: Customer → `/tickets`, Agent → `/queue`, Admin → `/admin/dashboard` | `GET /auth/me` |
| `/tickets` | Customer | My tickets: status filter, search | `GET /tickets?scope=mine` |
| `/tickets/new?relatedTo=` | Customer | Submit ticket (optionally as follow-up) | `GET /categories`, `POST /tickets` |
| `/tickets/:id` | any (if visible) | Ticket detail: conversation, actions driven by `permissions` | `GET /tickets/{id}`, comments, status, assign, patch |
| `/queue` | Agent | My assigned tickets: filters, sort, search | `GET /tickets?scope=assigned` |
| `/categories/:categoryId?` | Agent | Tickets in my categories (read-only unless assigned to me) | `GET /tickets?scope=category` |
| `/admin/dashboard` | Admin | Counts by status/priority, date range, drill-down | `GET /admin/dashboard`, `GET /tickets?scope=all` |
| `/admin/tickets` | Admin | All tickets, reassign any | `GET /tickets?scope=all` |
| `/admin/users` | Admin | List, create (invite), edit name/role/categories (no delete) | `/admin/users` |
| `/admin/categories` | Admin | List, create, rename, delete (soft), set default agent (required) | `/categories`, `GET /agents` |

Routes are declared in `client/src/routes.jsx`. All screens are styled with Tailwind CSS and call
the API through the shared axios instance in `client/src/api/client.js`.

## Responsive layout (all routes)

- Mobile-first; works from a 20rem-wide viewport to large desktops with no horizontal scrolling.
- Below `md` (48rem): navigation collapses into a menu button; tables render as stacked cards;
  forms and action buttons are full width; modals fill the screen.
- From `md`: tables, side-by-side ticket detail (conversation + details panel from `lg`, 64rem).
- Touch targets ≥ 2.75rem tall. All lengths in `rem` — no `px` anywhere in the client.

## Required UI states

- **Loading**: skeletons for lists and ticket detail.
- **Empty**: friendly message plus primary action (e.g., "No tickets yet — Submit a ticket").
- **Errors**: the error `message` shown in a toast; field errors shown inline on forms.
- **Read-only tickets** (Resolved/Closed): comment box replaced by a notice and a
  "Submit a follow-up ticket" button linking to `/tickets/new?relatedTo=:id`.
- **Reassign dialog**: pick a category (starts on the ticket's current one), then one of the agents
  in that category; the ticket's category changes to it.
- **Unverified customer**: banner with "Resend verification email"; submit button disabled.
