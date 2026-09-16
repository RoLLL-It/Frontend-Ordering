# Roll-IT — High Level Design (HLD)

**Product:** Roll-IT web ordering platform
**Tagline:** A roll that makes you feel whole.
**Version:** 1.0 · September 2026
**Audience:** Backend engineer, Frontend engineer, DevOps

---

## 1. What we are building

A closed-community food ordering web app for Roll-IT, a single cloud kitchen serving three fixed delivery points: **LJ**, **TTECH**, and **Strata**.

This is a **web alternative to the WhatsApp bot** — same kitchen, same menu, same orders, different front door. Both channels write to one database and one order pipeline. A developer should read this as: the web app is a second client on the same backend.

### Scope boundaries

**In scope for v1**
- User registration and login (email + phone + password)
- Menu browsing with live availability
- Cart, checkout, fixed delivery slot selection
- Order placement (COD) and order status tracking
- Reviews (write and read)
- Admin: menu management, item on/off, delivery on/off, user management, order queue

**Explicitly out of scope for v1**
- Online payment (COD only — see §9)
- Multiple kitchens or outlets
- Delivery-partner tracking / live map
- Push notifications / native mobile apps
- Coupons, loyalty points, referrals

Out-of-scope items must not have half-built tables or dead endpoints. Ship them later, cleanly.

---

## 2. Users and roles

| Role | Who | Gets |
|---|---|---|
| `CUSTOMER` | Staff/students at LJ, TTECH, Strata | Browse, order, track, review |
| `ADMIN` | Kitchen owner/manager | Everything below plus user management |
| `STAFF` | Kitchen counter person | Order queue, mark order status, toggle item availability |

Roles are a single `role` column, not a permissions matrix. Three roles is not enough complexity to justify RBAC tables. If a fourth role appears, revisit.

**Closed community rule:** anyone can register, but an order can only be placed to one of the three locations. There is no "enter your address" free text. This is the single biggest simplification in the whole system — delivery is to three known points, so there is no geocoding, no distance calculation, no delivery-radius logic, and no address validation.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                          │
│   Next.js web app          WhatsApp bot (phase 2)   │
│   (customer + admin)       (Cloud API webhook)      │
└──────────┬──────────────────────────┬───────────────┘
           │  HTTPS / JSON            │
           ▼                          ▼
┌─────────────────────────────────────────────────────┐
│              Go REST API  (single service)          │
│  ┌───────────────────────────────────────────────┐  │
│  │ HTTP layer: chi router, middleware chain      │  │
│  │  requestID → logger → recover → CORS →        │  │
│  │  rateLimit → auth → roleGuard                 │  │
│  ├───────────────────────────────────────────────┤  │
│  │ Handlers  →  Services (business logic)        │  │
│  │                  ↓                            │  │
│  │              Repositories (pgx)               │  │
│  └───────────────────────────────────────────────┘  │
└──────────┬─────────────────────────┬────────────────┘
           ▼                         ▼
   ┌───────────────┐        ┌──────────────────┐
   │  PostgreSQL   │        │  Object storage  │
   │  (managed)    │        │  (menu images)   │
   │  + PgBouncer  │        │  DO Spaces / S3  │
   └───────────────┘        └──────────────────┘
```

### Deployment decision: App Platform, not Functions

The WhatsApp bot plan used DigitalOcean Functions, which suits bursty stateless webhooks. **The web API should not run on Functions.** Reasons:

- A REST API needs a persistent connection pool. Serverless functions open a new DB connection per cold instance and will exhaust Postgres.
- Order status polling means steady traffic, not bursts — the serverless cost advantage disappears.
- Local development and debugging are markedly simpler with one long-running binary.

**Run the Go API on DigitalOcean App Platform** (or a single Droplet behind nginx). Keep the WhatsApp webhook on Functions if you like — it can call this same API over HTTP, or be folded in as another route later. One database either way.

### Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind | Team constraint. SSR for menu/home helps first paint. |
| State | TanStack Query + Zustand (cart only) | Server state and client state are different problems; don't force one tool to do both. |
| Backend | Go 1.22+, chi router, pgx v5 | Stated preference. chi over Gin: stdlib-compatible, smaller surface. |
| DB | PostgreSQL 15+ managed, PgBouncer pool | Relational data with real constraints. |
| Auth | JWT access (15 min) + refresh token (30 d, rotating, httpOnly cookie) | See §5. |
| Images | DO Spaces / S3, presigned upload | Never store binaries in Postgres. |
| Migrations | golang-migrate | Versioned, reversible, checked into git. |

---

## 4. Core domain flows

### Customer order flow

```
Register → Login → Home → Menu → Cart → Location + Slot → Confirm
                                                              ↓
                                                       Order created
                                                    (status: PLACED)
                                                              ↓
   Order Status page (polls) ← STAFF advances status in admin queue
                                                              ↓
                            PLACED → ACCEPTED → PREPARING → READY
                                → OUT_FOR_DELIVERY → DELIVERED
                                                              ↓
                                                    Review prompt
```

### Order status model

```
        ┌──────────┐
        │  PLACED  │ ← customer may cancel (2-min window)
        └────┬─────┘
             │ staff accepts
        ┌────▼─────┐
        │ ACCEPTED │ ← customer can no longer cancel
        └────┬─────┘
        ┌────▼─────┐
        │PREPARING │
        └────┬─────┘
        ┌────▼─────┐
        │  READY   │
        └────┬─────┘
   ┌─────────▼──────────┐
   │ OUT_FOR_DELIVERY   │
   └─────────┬──────────┘
        ┌────▼─────┐
        │DELIVERED │ → review becomes available
        └──────────┘

   Terminal side-states, reachable from PLACED/ACCEPTED only:
        CANCELLED_BY_USER   CANCELLED_BY_ADMIN
```

Transitions are **forward-only** except cancellation. The backend must reject any request to move an order backward — that is a data-integrity rule, not a UI concern. The full transition table is in the LLD.

---

## 5. Authentication design

### Registration
Captures **name, email, phone, password**. Email and phone are both unique, and **either can be used as the login identifier**. The login form takes one `identifier` field and the backend decides whether it looks like an email or a phone.

Password rules: minimum 8 characters, must contain a letter and a digit. Hashed with **bcrypt cost 12**. Never log or return the hash.

### Sessions
- **Access token**: JWT, 15-minute expiry, sent as `Authorization: Bearer <token>`. Claims: `sub` (user id), `role`, `exp`, `iat`, `jti`.
- **Refresh token**: opaque random 32 bytes, stored hashed in the DB, 30-day expiry, delivered as an **httpOnly, Secure, SameSite=Lax cookie**.
- **Rotation**: each refresh issues a new refresh token and revokes the old one. If a revoked token is presented, revoke the entire family — that pattern indicates theft.

**Why not put the access token in localStorage:** any XSS on the page can read it. The refresh token in an httpOnly cookie cannot be read by JavaScript, so an XSS gets at most 15 minutes of access rather than 30 days.

### Admin login
**Same endpoint, same form.** The response includes the user's role, and the frontend routes to `/admin` if the role is `ADMIN` or `STAFF`. Do not build a separate admin login page with a separate endpoint — it doubles the auth surface and is the classic place where an auth bypass hides.

Authorization is enforced **server-side on every admin endpoint**. Hiding an admin button in the UI is not security.

---

## 6. Delivery slots and capacity

This is the most business-specific part of the system and the part most likely to be built wrong. Read carefully.

**Model:** Admin defines a set of slots per location per day. Each slot has a `capacity` (max orders). A customer picks location first, then sees only slots for that location that are (a) in the future, (b) not at capacity, and (c) not past their cutoff.

```
slot = { location, date, start_time, capacity, cutoff_minutes }

available(slot) = now < (slot.start_time - cutoff_minutes)
                  AND count(orders for slot) < slot.capacity
                  AND delivery_enabled(location) == true
```

**Cutoff** exists because the kitchen needs lead time. A 1:00pm slot with a 30-minute cutoff stops accepting orders at 12:30pm.

**The race condition you must handle:** two customers submit for the last remaining spot in a slot at the same moment. Checking capacity and then inserting the order in two separate statements will oversell the slot.

The fix, stated explicitly so it is not left to interpretation: take a row lock on the slot inside the order-creation transaction (`SELECT ... FOR UPDATE`), re-count orders for that slot, and only then insert. If capacity is exceeded, roll back and return `SLOT_FULL`. Exact SQL in the LLD §4.3.

**Global delivery toggle:** admin can turn delivery off entirely (kitchen closed, staff shortage). When off, the menu is still browsable but checkout is blocked with a clear banner. Per-location toggles also exist — TTECH may be paused while LJ runs.

---

## 7. Menu and availability

Menu items belong to categories. Each item has an `is_available` boolean that **staff can toggle instantly** — this is the single most-used admin control, because items run out mid-service.

Two rules that prevent real bugs:

1. **Unavailable items stay visible, greyed out, with "Sold out".** Hiding them makes customers think the menu shrank and they ask staff about it.
2. **Availability is re-checked at checkout.** An item can sell out while it sits in someone's cart. The order-creation endpoint must validate every line item and reject with a list of which items became unavailable. The frontend then shows exactly which ones and lets the customer remove them.

**Price snapshotting:** `order_items` stores `name_snapshot` and `price_snapshot_paise`. When the admin raises a price, historical orders must not silently change. This is non-negotiable for any order history or accounting.

**Money is integer paise everywhere.** Never `float`. Never `NUMERIC` in Go structs. `price_paise int64`. Format to rupees only at the display layer.

---

## 8. Reviews

- A user may review **only an order they placed** that reached `DELIVERED`.
- **One review per order**, editable within 24 hours, then locked.
- Rating 1–5 stars, required. Comment optional, max 500 characters.
- Reviews display the reviewer's **first name only** (`Heet C.`), never email or phone.
- Admin can hide a review (soft flag `is_hidden`), not delete it.

Aggregate rating is computed per item and cached on the item row, recalculated on write. Do not compute `AVG()` across the whole review table on every menu page load.

---

## 9. Payments in v1

**COD only.** No gateway integration in v1.

Rationale, since this is a deliberate reversal of the WhatsApp plan: for a closed community of three known locations with repeat customers, payment risk is low and the cost of a gateway (integration time plus per-transaction fee) is not yet justified. Add online payment in phase 2 once order volume is proven.

**However** — build the schema ready for it. `orders` carries `payment_mode` and `payment_status` from day one, with `payment_mode` defaulting to `COD`. Adding a gateway later is then a new service plus a webhook handler, not a migration of live order data.

---

## 10. Non-functional requirements

| Concern | Target | How |
|---|---|---|
| Latency | p95 < 300ms for menu/order reads | Index properly; cache menu in memory with 60s TTL |
| Availability | Best-effort; kitchen hours only | Single region is fine |
| Concurrency | ~50 concurrent users at lunch peak | Well within a single small instance |
| Order integrity | Zero oversold slots | Row-level locking, §6 |
| Security | No plaintext secrets, no client-trusted prices | §11 |
| Accessibility | WCAG AA | See design system doc |
| Mobile | Primary target — most orders come from phones | Mobile-first CSS, 375px baseline |

**Traffic shape matters more than volume.** This app is near-idle for 22 hours and then takes almost all its traffic in two ~45-minute windows around lunch and dinner. Load-test the spike, not the average.

---

## 11. Security requirements

Non-negotiable, and each maps to a specific way this app could be exploited:

1. **Never trust client-sent prices.** The cart posts item IDs and quantities only. The server looks up prices. Otherwise a user edits the request and buys a roll for ₹1.
2. **Authorization on every endpoint**, checked against the JWT's role claim. Every `/admin/*` route passes through `RequireRole(ADMIN)`.
3. **Ownership checks on every resource.** `GET /orders/{id}` must confirm the order belongs to the requesting user, unless the requester is admin/staff. Without this, changing a number in the URL reads someone else's order — the most common vulnerability class in apps like this.
4. **Rate limit auth endpoints.** 5 attempts per identifier per 15 minutes on login; 3 registrations per IP per hour.
5. **Parameterized queries only.** pgx does this by default; never build SQL with `fmt.Sprintf`.
6. **Validate and re-encode uploaded images** server-side; cap at 2 MB; allow only jpeg/png/webp.
7. **Secrets from environment**, never committed. `.env.example` documents the names with dummy values.
8. **HTTPS only** in production; `Secure` flag on cookies; HSTS header.
9. **Generic auth errors.** "Invalid credentials" — never "no such email", which lets an attacker enumerate registered users.

---

## 12. Environments

| Env | URL | DB | Notes |
|---|---|---|---|
| Local | localhost:3000 / :8080 | Docker Postgres | `docker-compose up` brings up db + api |
| Staging | staging.roll-it.app | Managed, small | Seeded with demo data |
| Production | roll-it.app | Managed + pool + daily backup | Restricted access |

**Required env vars** (both `.env.example` and this table must stay in sync):

```
DATABASE_URL            postgres://user:pass@host:5432/rollit?sslmode=require
JWT_SECRET              32+ random bytes, base64
JWT_ACCESS_TTL          15m
REFRESH_TTL             720h
BCRYPT_COST             12
PORT                    8080
CORS_ALLOWED_ORIGINS    https://roll-it.app
S3_ENDPOINT             https://blr1.digitaloceanspaces.com
S3_BUCKET               rollit-menu
S3_ACCESS_KEY           …
S3_SECRET_KEY           …
LOG_LEVEL               info
ENV                     production
```

---

## 13. Delivery plan

| Sprint | Backend | Frontend | Exit criteria |
|---|---|---|---|
| **1** | Project skeleton, migrations, auth (register/login/refresh), user CRUD | Design system setup, register, login, welcome/home | A user can register and log in on staging |
| **2** | Menu CRUD, categories, availability toggle, image upload | Menu page, admin menu editor | Admin edits menu, customer sees it live |
| **3** | Cart validation, slots, order creation with locking | Cart, location+slot page, confirmation | An order can be placed end to end |
| **4** | Order status transitions, admin order queue, user management | Order status page, admin dashboard | Staff can advance an order; customer sees it |
| **5** | Reviews write/read, aggregates | Give review, see review pages | Full loop closes |
| **6** | Hardening: rate limits, logging, error handling, load test | Polish, empty/error states, accessibility pass | Production ready |

Backend and frontend can work in parallel from sprint 1 because **the API contract in the LLD is fixed before coding starts**. Frontend mocks against it with MSW until real endpoints land.

---

## 14. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Slot oversell race | Kitchen overcommits, customers angry | Row locking, §6 — test it explicitly with concurrent requests |
| Item sells out mid-cart | Customer pays for unavailable food | Re-validate at checkout, §7 |
| Lunch-hour spike | Slow or down at the only moment it matters | Load test the spike shape; cache the menu |
| Admin credentials shared among staff | No audit trail | Separate `STAFF` role with narrower powers; log `actor_id` on every status change |
| Scope creep into payments/tracking | Sprint 6 never arrives | §1 boundaries are firm for v1 |
| Frontend blocked on backend | Half the team idle | Fixed API contract + MSW mocks from day one |

---

## 15. Companion documents

| Doc | Contents | Primary reader |
|---|---|---|
| `02-LLD.md` | DB schema, full API contract, Go layout, state machines, error codes | Backend |
| `03-FRONTEND-SPEC.md` | All 11 pages: routes, components, state, validation, every UI state | Frontend |
| `04-DESIGN-SYSTEM.md` | Colors, type, spacing, components, accessibility rules | Frontend, Design |

Read this HLD first. It is the shared context; the other three assume it.
