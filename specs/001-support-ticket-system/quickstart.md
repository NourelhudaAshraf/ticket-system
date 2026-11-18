# Quickstart & Validation Guide: Support Ticket System

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to run the system locally and prove each user story works end to end. Endpoint details are in
[contracts/rest-api.md](contracts/rest-api.md); screens are in
[contracts/ui-routes.md](contracts/ui-routes.md).

## Prerequisites

- .NET 10 SDK, Node.js 24 LTS.
- A MongoDB Atlas cluster with your IP in **Network Access**.
- A Gmail account with 2-step verification and an **app password**.

## Run locally

```powershell
# 1. Configure database and email (stored outside source control, like a gitignored .env)
dotnet user-secrets --project API set "Mongo:ConnectionString" "mongodb+srv://<user>:<password>@<cluster>/ticketsystem?appName=Cluster0"
dotnet user-secrets --project API set "Mongo:Database" "ticketsystem"
dotnet user-secrets --project API set "Smtp:Host" "smtp.gmail.com"
dotnet user-secrets --project API set "Smtp:Port" "587"
dotnet user-secrets --project API set "Smtp:UseSsl" "false"
dotnet user-secrets --project API set "Smtp:UserName" "<you>@gmail.com"
dotnet user-secrets --project API set "Smtp:Password" "<gmail-app-password>"
dotnet user-secrets --project API set "Smtp:FromAddress" "<you>@gmail.com"
dotnet user-secrets --project API set "Smtp:FromName" "Ticket System"

# 2. Configure the first admin (use a real inbox; Gmail plus-addresses work)
dotnet user-secrets --project API set "Seed:AdminName" "<your-name>"
dotnet user-secrets --project API set "Seed:AdminEmail" "<you>+admin@gmail.com"
dotnet user-secrets --project API set "Seed:AdminPassword" "<choose-a-password>"

# Development sample data: agent Basma, default agent of five categories
# (Technical Support, Help Desk, Billing, Account & Access, Hardware & Network)
dotnet user-secrets --project API set "Seed:DevAgentName" "Basma"
dotnet user-secrets --project API set "Seed:DevAgentEmail" "<you>+basma@gmail.com"
dotnet user-secrets --project API set "Seed:DevAgentPassword" "<choose-a-password>"

# 3. Run the API (creates indexes, the admin, and the sample data on first start)
dotnet run --project API

# 4. Run the React client (Vite proxies /api to the API)
cd client; npm install; npm run dev
```

| Service | URL |
|---------|-----|
| React client | http://localhost:5173 |
| API docs (try endpoints) | https://localhost:7227/swagger (Swagger UI; raw document at /openapi/v1.json) |
| Email inbox | Your Gmail inbox (plus-addresses like `<you>+basma@gmail.com` all arrive there) |
| MongoDB | Atlas cluster from `Mongo:ConnectionString` (browse data in Atlas or MongoDB Compass) |

## Build checks

There are no automated tests in v1. Before merging, run:

```powershell
dotnet build                       # no errors, no new warnings
cd client; npm run lint; npm run build
```

Then run the validation scenarios below that cover the change.

## Validation scenarios

Run these in the browser after setup. Check emails in your Gmail inbox. Give every test account a
plus-address of your Gmail (`<you>+basma@gmail.com`, `<you>+carol@gmail.com`, `<you>+customer@gmail.com`)
so all emails reach one real inbox.

### Setup data (Story 4 — admin)

1. Sign in as the seeded admin → lands on `/admin/dashboard`.
2. `/admin/users` lists the seeded agent Basma; `/admin/categories` lists the five sample
   categories, each with default agent Basma.
3. `/admin/users`: invite agent **Carol** (`<you>+carol@gmail.com`, no categories) → invitation
   email arrives; open the link and set a password. Edit Carol's name → saved.
4. `/admin/categories`: try creating **Temp** without a default agent → rejected
   (`validation_failed`). Create **Temp** with default agent Carol → Carol now belongs to Temp.
   Rename it to **Temporary** → saved.
5. Edit Carol → remove Temporary from her categories → rejected (`agent_is_default`).
6. Delete **Temporary** → it disappears from all lists and pickers.

**Expected**: users and categories listed; every category shows its default agent; there is no
delete or deactivate action for users.

### Story 1 — customer submits and tracks a ticket

1. Register a customer at `/register` → verification email arrives → open link → sign in.
2. Submit a **Billing** ticket, priority High.

**Expected**: ticket appears at top of `/tickets` with its Id, status Open, assigned to Basma.
Opening another customer's ticket URL shows "Not found".

### Story 2 — agent works tickets

Needs agent Carol (Billing) from "Setup data" step 3.

1. As the customer, submit a **Technical Support** ticket → it is assigned to Basma automatically.
2. Sign in as Basma → `/queue` shows it.
3. Basma replies, moves Open → In Progress → Resolved. Try Open → Closed via the API → 422
   `invalid_transition`.
4. Sign in as Carol: she sees the Story 1 **Billing** ticket (assigned to Basma) read-only in her
   category view, with no reply or status actions.
5. As the customer, submit another **Technical Support** ticket whose description is about an
   invoice. Basma reassigns it to Carol and chooses **Billing** → it leaves Basma's queue, appears in
   Carol's, and its category is now Billing. Reassigning to Carol with category Technical Support →
   rejected (`agent_not_eligible`, Carol is not in Technical Support).

**Expected**: each change shows immediately on the ticket; there is no history list.

### Story 3 — *(Removed 2026-11-04: ticket-update notifications dropped to keep the app simple.)*

### Account email failure

1. Set a wrong `Smtp:Password` in user secrets and restart the API; request a reset on the
   Forgot password page → the page still shows its message and the API logs an email error (no
   email). Restore the password, restart, then click **Send again** → the email arrives.

### Read-only and closing

1. As the customer, open the Resolved ticket → no comment box; **Submit a follow-up ticket**
   opens a form linked to the original number.
2. As Basma, open the same ticket → the only status action is **Close** → ticket becomes Closed.
3. Open the Closed ticket → no comment box and no status actions.

**Expected**: the ticket shows Closed; no ticket is ever
closed automatically.

### Story 5 — dashboard and search

1. Admin dashboard shows counts matching the tickets created above; click **High** → list of
   High-priority tickets; apply a date range → counts change accordingly.
2. Search a ticket's Id (copy it from the URL) and a word from a description as the customer, as Carol, and as admin.

**Expected**: each user sees only tickets they may see (customer: own; Carol: Billing plus tickets assigned to her;
admin: all).

### Responsive and rem checks

1. `cd client; npm run lint` → the no-px check passes.
2. In browser dev tools, use device mode at 320 × 640, 768 × 1024, and 1440 × 900. On each
   page: no horizontal scrolling; at 320 the nav is a menu button and lists are cards.
3. Set the browser's default font size to 20 → text, spacing, and layout scale up together.

### Security spot checks


- Call any `/api/v1` endpoint without signing in (e.g. open `/api/v1/categories` in a private window) → 401 `unauthenticated`.
- Signed in as a customer, call an admin endpoint (e.g. `GET /api/v1/users`) → 403 `forbidden`.
- A wrong password → 401 `invalid_credentials`, and the account still works with the right one (no lockout).
