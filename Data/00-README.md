# Roll-IT — Engineering Documentation

**A roll that makes you feel whole.**

Web ordering platform for the Roll-IT cloud kitchen. Closed community, three delivery points: **LJ · TTECH · Strata**.

---

## Read in this order

| # | Document | Who reads it | What's in it |
|---|---|---|---|
| **01** | `01-HLD.md` | **Everyone — read first** | Scope, roles, architecture, deployment, auth model, slot capacity, security requirements, sprint plan |
| **02** | `02-LLD.md` | Backend | Full DB schema, complete API contract, Go project layout, order state machine, error codes, test requirements |
| **03** | `03-FRONTEND-SPEC.md` | Frontend | All 11 pages in build detail: routes, components, state, validation, every loading/empty/error state |
| **04** | `04-DESIGN-SYSTEM.md` | Frontend, Design | Colors (sampled from the logo), typography, spacing, components, accessibility rules, copy voice |

Plus the **visual mockups** — a canvas of 12 artboards (10 mobile screens + 2 admin desktop views), published separately.

---

## Decisions already made — don't relitigate these

| Decision | Value |
|---|---|
| Frontend | Next.js 14+ App Router, TypeScript strict, Tailwind |
| Backend | Go 1.22+, chi router, pgx v5 |
| Database | PostgreSQL 15+ managed, **with PgBouncer pool** |
| Hosting | DO App Platform for the API (**not** Functions — see HLD §3) |
| Auth | Email **and** phone **and** password at registration; either identifier logs in |
| Sessions | JWT access 15min in memory + rotating refresh token in httpOnly cookie |
| Roles | `CUSTOMER` · `STAFF` · `ADMIN` (one column, no RBAC tables) |
| Payment v1 | **COD only** — schema is gateway-ready, integration is phase 2 |
| Delivery | Three fixed locations, no free-text addresses |
| Slots | Fixed slots per location per day, capacity-capped, with a cutoff |
| Money | **Integer paise everywhere.** Never float. |

---

## The five things most likely to be built wrong

Each of these has bitten a real food-ordering app. They're specified in detail in the LLD; this is the short list to keep in your head.

1. **Slot overselling.** Two customers take the last spot at the same moment. The fix is a `SELECT ... FOR UPDATE` row lock on the slot inside the order transaction, plus a `booked_count <= capacity` CHECK as a database backstop. LLD §5.5 has the exact code. **Test it with 50 concurrent requests** — a happy-path test passes on broken code.

2. **Trusting client prices.** The cart must post item IDs and quantities only. The server looks up every price. Otherwise someone edits the request and buys lunch for ₹1.

3. **Missing ownership checks.** `GET /orders/{id}` must verify the order belongs to the caller. Without it, changing a number in the URL reads a stranger's order.

4. **Unsnapshotted prices.** `order_items` stores the name and price *at order time*. Raise a price next month and last week's orders must not silently change.

5. **Cancellation not releasing the slot.** Every transition into a cancelled state must decrement `booked_count` in the same transaction — otherwise the slot shows full while the kitchen sits idle.

---

## Accessibility note that affects the whole UI

The logo orange `#CC5E0F` measures **4.06:1 on white** — it fails WCAG AA for body text.

Use it for button fills, large headings (24px+), and icons. For **orange text at body size, use `#B54F0A`** (5.14:1). Design system §1 has the full measured table.

---

## Parallel work

Backend and frontend can start together in sprint 1. The API contract in the LLD is **fixed before coding begins** — frontend mocks against it with MSW until real endpoints land.

Any change to the contract in `02-LLD.md` must be communicated to the frontend engineer. That document is the interface between the two of you.

---

## Open questions for the product owner

These were deliberately left out of v1 scope and should be decided before phase 2:

- Online payment: which gateway, and at what order volume does it become worth it?
- Password reset: currently "contact the kitchen." Needs email or SMS to automate.
- Do staff need per-person accounts for audit, or is one shared `STAFF` login acceptable?
- Delivery fee: currently per-location and set to free for LJ. Confirm the real numbers.
- Slot capacity: what can the kitchen actually produce in a 30-minute window?
