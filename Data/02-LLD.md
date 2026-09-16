# Roll-IT — Low Level Design (LLD)

**Audience:** Backend engineer
**Prerequisite:** Read `01-HLD.md` first
**Version:** 1.0 · September 2026

This document is the contract. The frontend spec is written against these exact endpoints, field names, and error codes. **Changing anything here requires telling the frontend engineer.**

---

## 1. Project layout

```
roll-it-api/
├── cmd/
│   └── api/
│       └── main.go                 # wiring only: config → deps → router → serve
├── internal/
│   ├── config/
│   │   └── config.go               # env parsing, fails fast on missing vars
│   ├── http/
│   │   ├── router.go               # all routes registered here, one place
│   │   ├── middleware/
│   │   │   ├── auth.go             # JWT parse → context
│   │   │   ├── role.go             # RequireRole(...)
│   │   │   ├── ratelimit.go
│   │   │   ├── requestid.go
│   │   │   ├── logger.go
│   │   │   ├── recover.go
│   │   │   └── cors.go
│   │   ├── handler/
│   │   │   ├── auth.go
│   │   │   ├── menu.go
│   │   │   ├── order.go
│   │   │   ├── slot.go
│   │   │   ├── review.go
│   │   │   ├── admin_user.go
│   │   │   └── admin_menu.go
│   │   ├── request/                # DTO structs + validation tags
│   │   ├── response/               # response DTOs + envelope helpers
│   │   └── errs/
│   │       └── errors.go           # AppError type + catalogue
│   ├── service/                    # business logic, no HTTP, no SQL
│   │   ├── auth.go
│   │   ├── menu.go
│   │   ├── order.go                # slot locking lives here
│   │   ├── slot.go
│   │   ├── review.go
│   │   └── user.go
│   ├── repo/                       # SQL only, no business rules
│   │   ├── user.go
│   │   ├── menu.go
│   │   ├── order.go
│   │   ├── slot.go
│   │   ├── review.go
│   │   └── tx.go                   # transaction helper
│   ├── domain/                     # entities + enums, zero dependencies
│   │   ├── user.go
│   │   ├── order.go
│   │   ├── menu.go
│   │   └── errors.go
│   ├── money/
│   │   └── paise.go                # integer money, formatting
│   └── platform/
│       ├── db/postgres.go
│       ├── storage/s3.go
│       └── token/jwt.go
├── migrations/
│   ├── 000001_init.up.sql
│   └── 000001_init.down.sql
├── seed/
│   └── seed.go                     # demo menu, slots, admin user
├── docker-compose.yml
├── Makefile
├── .env.example
└── go.mod
```

**Layering rule, enforced in review:** `handler → service → repo`. A handler never touches SQL. A service never imports `net/http`. `domain` imports nothing from the project. Violating this is what turns a clean codebase into one where nothing can be tested.

---

## 2. Database schema

Full initial migration. PostgreSQL 15+.

```sql
-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email

-- ============ ENUMS ============
CREATE TYPE user_role      AS ENUM ('CUSTOMER','STAFF','ADMIN');
CREATE TYPE order_status   AS ENUM (
  'PLACED','ACCEPTED','PREPARING','READY',
  'OUT_FOR_DELIVERY','DELIVERED',
  'CANCELLED_BY_USER','CANCELLED_BY_ADMIN'
);
CREATE TYPE payment_mode   AS ENUM ('COD','ONLINE');
CREATE TYPE payment_status AS ENUM ('PENDING','PAID','FAILED','REFUNDED');

-- ============ USERS ============
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 60),
  email          CITEXT      NOT NULL UNIQUE,
  phone          TEXT        NOT NULL UNIQUE CHECK (phone ~ '^[6-9][0-9]{9}$'),
  password_hash  TEXT        NOT NULL,
  role           user_role   NOT NULL DEFAULT 'CUSTOMER',
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role) WHERE is_active;

-- phone stored as bare 10 digits, no +91, no spaces. Normalize on input.

-- ============ REFRESH TOKENS ============
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,           -- sha256 of the raw token
  family_id   UUID NOT NULL,                  -- rotation lineage
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rt_user   ON refresh_tokens(user_id);
CREATE INDEX idx_rt_family ON refresh_tokens(family_id);

-- ============ LOCATIONS ============
CREATE TABLE locations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,      -- 'LJ','TTECH','STRATA'
  name              TEXT NOT NULL,             -- 'LJ Campus'
  delivery_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_fee_paise INT    NOT NULL DEFAULT 0 CHECK (delivery_fee_paise >= 0),
  sort_order        INT     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ MENU ============
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT  NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  price_paise   INT  NOT NULL CHECK (price_paise > 0),
  image_url     TEXT,
  is_veg        BOOLEAN NOT NULL DEFAULT TRUE,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,   -- staff toggle, changes hourly
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,   -- admin soft-delete, permanent
  rating_avg    NUMERIC(2,1) NOT NULL DEFAULT 0, -- cached, display only
  rating_count  INT          NOT NULL DEFAULT 0,
  sort_order    INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_cat ON menu_items(category_id) WHERE is_active;
```

> **`is_available` vs `is_active`** — these are different and get confused. `is_available` is the sold-out toggle staff flip several times a day; the item stays on the menu greyed out. `is_active` is admin removing an item from the menu permanently; it disappears. Never hard-delete a menu item — old orders reference it.

```sql
-- ============ SLOTS ============
CREATE TABLE delivery_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  slot_date       DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  capacity        INT  NOT NULL CHECK (capacity > 0),
  booked_count    INT  NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  cutoff_minutes  INT  NOT NULL DEFAULT 30 CHECK (cutoff_minutes >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_slot UNIQUE (location_id, slot_date, start_time),
  CONSTRAINT ck_time CHECK (end_time > start_time),
  CONSTRAINT ck_capacity CHECK (booked_count <= capacity)
);
CREATE INDEX idx_slots_lookup ON delivery_slots(location_id, slot_date) WHERE is_active;
```

> `booked_count` is a denormalized counter maintained inside the order transaction. The `booked_count <= capacity` CHECK is the **database-level backstop** against overselling — even if application logic has a bug, Postgres refuses the row. Belt and braces, deliberately.

```sql
-- ============ ORDERS ============
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code          TEXT NOT NULL UNIQUE,     -- 'RIT-A47', spoken aloud
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  location_id         UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  slot_id             UUID NOT NULL REFERENCES delivery_slots(id) ON DELETE RESTRICT,
  status              order_status   NOT NULL DEFAULT 'PLACED',
  payment_mode        payment_mode   NOT NULL DEFAULT 'COD',
  payment_status      payment_status NOT NULL DEFAULT 'PENDING',
  subtotal_paise      INT NOT NULL CHECK (subtotal_paise >= 0),
  delivery_fee_paise  INT NOT NULL DEFAULT 0,
  total_paise         INT NOT NULL CHECK (total_paise >= 0),
  notes               TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 200),
  cancel_deadline_at  TIMESTAMPTZ NOT NULL,     -- placed_at + 2 min
  placed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user   ON orders(user_id, placed_at DESC);
CREATE INDEX idx_orders_slot   ON orders(slot_id);
CREATE INDEX idx_orders_queue  ON orders(status, placed_at)
  WHERE status IN ('PLACED','ACCEPTED','PREPARING','READY','OUT_FOR_DELIVERY');

CREATE TABLE order_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id         UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  name_snapshot        TEXT NOT NULL,
  price_snapshot_paise INT  NOT NULL CHECK (price_snapshot_paise > 0),
  quantity             INT  NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  line_total_paise     INT  NOT NULL
);
CREATE INDEX idx_oi_order ON order_items(order_id);

CREATE TABLE order_status_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status   order_status NOT NULL,
  actor_id    UUID REFERENCES users(id),   -- NULL = system
  note        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ose_order ON order_status_events(order_id, created_at);
```

> `order_status_events` is the audit trail. Write a row on **every** transition. When a customer says "nobody told me it was cancelled", this table is the answer.

```sql
-- ============ REVIEWS ============
CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL DEFAULT '' CHECK (length(comment) <= 500),
  is_hidden  BOOLEAN NOT NULL DEFAULT FALSE,
  editable_until TIMESTAMPTZ NOT NULL,        -- created_at + 24h
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_public ON reviews(created_at DESC) WHERE NOT is_hidden;

CREATE TABLE review_items (      -- which items the review covers
  review_id    UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, menu_item_id)
);

-- ============ SETTINGS ============
CREATE TABLE app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO app_settings(key,value) VALUES
  ('delivery_enabled','true'),
  ('kitchen_open','true'),
  ('announcement','');

-- ============ TRIGGER: updated_at ============
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_users_touch  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tg_items_touch  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER tg_orders_touch BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

### Seed data

```sql
INSERT INTO locations(code,name,sort_order) VALUES
  ('LJ','LJ Campus',1), ('TTECH','TTECH Park',2), ('STRATA','Strata',3);

INSERT INTO categories(name,sort_order) VALUES
  ('Veg Rolls',1),('Non-Veg Rolls',2),('Sides',3),('Beverages',4);
-- Admin user seeded via `make seed` with a password read from env, never hardcoded.
```

---

## 3. API conventions

**Base URL:** `/api/v1`

### Response envelope

Success:
```json
{ "data": { ... } }
```

List with pagination:
```json
{
  "data": [ ... ],
  "meta": { "page": 1, "page_size": 20, "total": 57, "total_pages": 3 }
}
```

Error — **always this shape**:
```json
{
  "error": {
    "code": "SLOT_FULL",
    "message": "This delivery slot is now full. Please choose another.",
    "details": { "slot_id": "…" },
    "request_id": "req_01H…"
  }
}
```

`message` is **shown to the user as-is**, so it must be plain and non-technical. `code` is what the frontend branches on — never parse the message.

### Headers
- `Authorization: Bearer <access_token>` on protected routes
- `X-Request-ID` echoed in every response; log it

### Conventions
- `snake_case` JSON fields
- Timestamps: RFC3339 UTC (`2026-09-11T07:30:00Z`)
- Money: integer paise, field always suffixed `_paise`
- IDs: UUID strings
- Pagination: `?page=1&page_size=20` (default 20, max 100)

---

## 4. Error code catalogue

The frontend has UI branches for these. Add a code here before using it.

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field validation failed; `details` maps field → message |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired access token |
| `INVALID_CREDENTIALS` | 401 | Login failed (deliberately generic) |
| `TOKEN_EXPIRED` | 401 | Access token expired — frontend should refresh and retry |
| `FORBIDDEN` | 403 | Authenticated but wrong role |
| `NOT_FOUND` | 404 | Resource missing or not owned by caller |
| `EMAIL_TAKEN` | 409 | Email already registered |
| `PHONE_TAKEN` | 409 | Phone already registered |
| `ITEMS_UNAVAILABLE` | 409 | One or more cart items sold out; `details.items[]` lists them |
| `SLOT_FULL` | 409 | Slot reached capacity |
| `SLOT_EXPIRED` | 409 | Past the slot cutoff |
| `DELIVERY_DISABLED` | 409 | Delivery off globally or for that location |
| `INVALID_TRANSITION` | 409 | Illegal order status change |
| `CANCEL_WINDOW_PASSED` | 409 | Past the 2-minute cancel deadline |
| `REVIEW_EXISTS` | 409 | Order already reviewed |
| `REVIEW_NOT_ALLOWED` | 409 | Order not delivered, or not the caller's |
| `REVIEW_LOCKED` | 409 | Past the 24h edit window |
| `RATE_LIMITED` | 429 | Too many attempts; `Retry-After` header set |
| `INTERNAL` | 500 | Unexpected — log full detail, return generic message |

---

## 5. Endpoint reference

### 5.1 Auth

#### `POST /api/v1/auth/register` — public
```json
// request
{
  "name": "Heet Chovatiya",
  "email": "heet@example.com",
  "phone": "9876543210",
  "password": "rollit2026"
}
```
Validation: `name` 2–60 chars · `email` valid, lowercased, unique · `phone` exactly 10 digits starting 6–9, unique, strip `+91`/spaces/dashes before validating · `password` min 8, ≥1 letter and ≥1 digit.

```json
// 201
{ "data": {
  "user": { "id":"…","name":"Heet Chovatiya","email":"heet@example.com",
            "phone":"9876543210","role":"CUSTOMER" },
  "access_token": "eyJ…",
  "expires_in": 900
}}
```
Also sets `refresh_token` httpOnly cookie.
Errors: `VALIDATION_ERROR`, `EMAIL_TAKEN`, `PHONE_TAKEN`, `RATE_LIMITED`.

#### `POST /api/v1/auth/login` — public
```json
{ "identifier": "heet@example.com", "password": "rollit2026" }
```
`identifier` accepts **email or 10-digit phone**. Detect with: contains `@` → email, else strip non-digits → phone. Same response shape as register.

Errors: `INVALID_CREDENTIALS` (wrong password **and** unknown user — same code, same message, and compare against a dummy hash when the user is absent so response timing doesn't leak existence), `RATE_LIMITED` after 5 failures per identifier per 15 min.

#### `POST /api/v1/auth/refresh` — cookie only
Reads the httpOnly cookie. Rotates: issues new access + new refresh, revokes old. If a **revoked** token is presented, revoke the whole `family_id` and return 401 — that signals a stolen token.

#### `POST /api/v1/auth/logout` — authed
Revokes the current refresh token, clears the cookie. Always 204, even if already logged out.

#### `GET /api/v1/auth/me` — authed
Returns the current user. Frontend calls this on mount to restore session.

---

### 5.2 Menu — public reads

#### `GET /api/v1/menu`
Returns the whole menu grouped by category. No pagination — this menu is small and the frontend filters client-side.

```json
{ "data": {
  "categories": [
    { "id":"…", "name":"Veg Rolls", "sort_order":1,
      "items":[
        { "id":"…","name":"Paneer Tikka Roll",
          "description":"Grilled paneer, onion, mint mayo",
          "price_paise":12000,"image_url":"https://…",
          "is_veg":true,"is_available":true,
          "rating_avg":4.5,"rating_count":23 }
      ]}
  ],
  "delivery_enabled": true,
  "kitchen_open": true,
  "announcement": ""
}}
```
Only `is_active = true` items. **Include `is_available:false` items** — frontend greys them out (HLD §7).
Cache in memory 60s; bust on any admin menu write.

#### `GET /api/v1/menu/items/{id}`
Single item plus its 5 most recent visible reviews.

---

### 5.3 Slots

#### `GET /api/v1/locations`
```json
{ "data": [ { "id":"…","code":"LJ","name":"LJ Campus",
              "delivery_enabled":true,"delivery_fee_paise":0 } ] }
```

#### `GET /api/v1/slots?location_id=…&date=2026-09-11` — authed
Returns slots for that location and date. `date` defaults to today.

```json
{ "data": [
  { "id":"…","start_time":"13:00","end_time":"13:30",
    "capacity":20,"booked_count":18,"seats_left":2,
    "is_available":true,"unavailable_reason":null },
  { "id":"…","start_time":"13:30","end_time":"14:00",
    "capacity":20,"booked_count":20,"seats_left":0,
    "is_available":false,"unavailable_reason":"FULL" }
]}
```
`unavailable_reason` ∈ `FULL` | `CUTOFF_PASSED` | `DELIVERY_DISABLED` | `null`.
Return **all** slots with reasons rather than filtering — the UI shows why a slot is disabled, which prevents "where did the 1pm slot go" support questions.

---

### 5.4 Cart validation

#### `POST /api/v1/cart/validate` — authed
Called when the cart page loads and before checkout. Prices come from the server, never the client.

```json
// request
{ "items": [ { "menu_item_id":"…", "quantity":2 } ],
  "location_id": "…" }
```
```json
// 200
{ "data": {
  "items": [
    { "menu_item_id":"…","name":"Paneer Tikka Roll","price_paise":12000,
      "quantity":2,"line_total_paise":24000,"is_available":true }
  ],
  "subtotal_paise":24000,
  "delivery_fee_paise":0,
  "total_paise":24000,
  "unavailable_items":[],
  "delivery_enabled":true
}}
```
If any item is unavailable it still returns **200** with that item flagged and listed in `unavailable_items` — the frontend needs the full picture to render the cart. Only `POST /orders` hard-fails with `ITEMS_UNAVAILABLE`.

---

### 5.5 Orders

#### `POST /api/v1/orders` — authed · **the critical endpoint**
```json
{ "items":[{"menu_item_id":"…","quantity":2}],
  "location_id":"…", "slot_id":"…",
  "notes":"less spicy", "payment_mode":"COD" }
```
```json
// 201
{ "data": { "id":"…","short_code":"RIT-A47","status":"PLACED",
  "total_paise":24000,"cancel_deadline_at":"2026-09-11T07:32:00Z",
  "slot":{"start_time":"13:00","end_time":"13:30"},
  "location":{"code":"LJ","name":"LJ Campus"} }}
```
Errors: `VALIDATION_ERROR`, `ITEMS_UNAVAILABLE`, `SLOT_FULL`, `SLOT_EXPIRED`, `DELIVERY_DISABLED`, `NOT_FOUND`.

**Implementation — must be exactly this, in one transaction:**

```go
func (s *OrderService) Create(ctx context.Context, userID uuid.UUID, in CreateOrderInput) (*domain.Order, error) {
    return repo.WithTx(ctx, s.db, func(tx pgx.Tx) (*domain.Order, error) {

        // 1. Global + location delivery flags
        if !s.settings.DeliveryEnabled(ctx) {
            return nil, errs.DeliveryDisabled()
        }
        loc, err := s.locRepo.GetTx(ctx, tx, in.LocationID)
        if err != nil { return nil, err }
        if !loc.DeliveryEnabled { return nil, errs.DeliveryDisabled() }

        // 2. LOCK THE SLOT ROW. Everything about correctness hinges on this line.
        //    Concurrent orders for the same slot serialize here.
        slot, err := s.slotRepo.GetForUpdate(ctx, tx, in.SlotID)  // SELECT … FOR UPDATE
        if err != nil { return nil, errs.NotFound("slot") }

        if slot.LocationID != in.LocationID { return nil, errs.Validation("slot", "does not belong to location") }
        if !slot.IsActive                   { return nil, errs.NotFound("slot") }
        if time.Now().After(slot.CutoffAt()) { return nil, errs.SlotExpired() }
        if slot.BookedCount >= slot.Capacity { return nil, errs.SlotFull() }

        // 3. Re-read items INSIDE the tx. Never trust client prices.
        ids := in.ItemIDs()
        items, err := s.menuRepo.GetManyTx(ctx, tx, ids)
        if err != nil { return nil, err }
        if len(items) != len(ids) { return nil, errs.NotFound("menu item") }

        var unavailable []string
        for _, it := range items {
            if !it.IsAvailable || !it.IsActive {
                unavailable = append(unavailable, it.Name)
            }
        }
        if len(unavailable) > 0 { return nil, errs.ItemsUnavailable(unavailable) }

        // 4. Compute totals server-side, integer paise only
        subtotal := 0
        lines := make([]domain.OrderItem, 0, len(items))
        byID := index(items)
        for _, ci := range in.Items {
            it := byID[ci.MenuItemID]
            line := it.PricePaise * ci.Quantity
            subtotal += line
            lines = append(lines, domain.OrderItem{
                MenuItemID: it.ID,
                NameSnapshot: it.Name,               // snapshot — HLD §7
                PriceSnapshotPaise: it.PricePaise,
                Quantity: ci.Quantity,
                LineTotalPaise: line,
            })
        }
        total := subtotal + loc.DeliveryFeePaise

        // 5. Insert order + items
        order := domain.Order{
            ShortCode: s.codes.Next(ctx, tx),        // see §6
            UserID: userID, LocationID: loc.ID, SlotID: slot.ID,
            Status: domain.StatusPlaced,
            PaymentMode: domain.PaymentCOD, PaymentStatus: domain.PayPending,
            SubtotalPaise: subtotal,
            DeliveryFeePaise: loc.DeliveryFeePaise,
            TotalPaise: total,
            Notes: in.Notes,
            CancelDeadlineAt: time.Now().Add(2 * time.Minute),
        }
        if err := s.orderRepo.InsertTx(ctx, tx, &order, lines); err != nil {
            return nil, err
        }

        // 6. Increment the counter. The CHECK constraint is the last line of defence.
        if err := s.slotRepo.IncrementBookedTx(ctx, tx, slot.ID); err != nil {
            return nil, errs.SlotFull()   // CHECK violation surfaces here
        }

        // 7. Audit
        s.orderRepo.InsertEventTx(ctx, tx, order.ID, nil, domain.StatusPlaced, &userID, "")

        return &order, nil
    })
}
```

```sql
-- slotRepo.GetForUpdate
SELECT id, location_id, slot_date, start_time, end_time,
       capacity, booked_count, cutoff_minutes, is_active
FROM delivery_slots
WHERE id = $1
FOR UPDATE;              -- ← the lock

-- slotRepo.IncrementBookedTx
UPDATE delivery_slots
SET booked_count = booked_count + 1
WHERE id = $1 AND booked_count < capacity;
-- 0 rows affected → slot filled concurrently → return SLOT_FULL
```

> **Test this explicitly.** Fire 50 concurrent requests at a slot with capacity 10 and assert exactly 10 succeed and 40 return `SLOT_FULL`. A test that only checks the happy path will pass on broken code.

#### `GET /api/v1/orders` — authed
Caller's orders, newest first, paginated. `?status=active` filters to non-terminal statuses.

#### `GET /api/v1/orders/{id}` — authed
Full order with items and status timeline.
**Ownership check:** `order.user_id == caller.id` unless role is `ADMIN`/`STAFF`; otherwise `NOT_FOUND` (not `FORBIDDEN` — don't confirm the order exists).

```json
{ "data": { "id":"…","short_code":"RIT-A47","status":"PREPARING",
  "items":[{"name":"Paneer Tikka Roll","quantity":2,
            "price_snapshot_paise":12000,"line_total_paise":24000}],
  "subtotal_paise":24000,"delivery_fee_paise":0,"total_paise":24000,
  "location":{"code":"LJ","name":"LJ Campus"},
  "slot":{"start_time":"13:00","end_time":"13:30","slot_date":"2026-09-11"},
  "payment_mode":"COD","payment_status":"PENDING",
  "notes":"less spicy",
  "can_cancel":false, "can_review":false,
  "cancel_deadline_at":"2026-09-11T07:32:00Z",
  "placed_at":"2026-09-11T07:30:00Z",
  "timeline":[
    {"status":"PLACED","at":"2026-09-11T07:30:00Z"},
    {"status":"ACCEPTED","at":"2026-09-11T07:31:10Z"},
    {"status":"PREPARING","at":"2026-09-11T07:35:00Z"}
  ]}}
```
> `can_cancel` and `can_review` are **computed server-side**. The frontend must not re-derive these from timestamps — two clocks, two answers, one bug.

#### `POST /api/v1/orders/{id}/cancel` — authed
Allowed only if owner **and** status ∈ {`PLACED`} **and** `now < cancel_deadline_at`. Decrements `booked_count`. Errors: `CANCEL_WINDOW_PASSED`, `INVALID_TRANSITION`.

---

### 5.6 Reviews

#### `POST /api/v1/reviews` — authed
```json
{ "order_id":"…", "rating":5, "comment":"Best roll on campus." }
```
Rules: order belongs to caller · status is `DELIVERED` · no existing review. Sets `editable_until = now() + 24h`, links `review_items` from the order's items, recalculates each item's `rating_avg`/`rating_count`.
Errors: `REVIEW_NOT_ALLOWED`, `REVIEW_EXISTS`.

#### `PATCH /api/v1/reviews/{id}` — authed
Owner only, and only while `now < editable_until`. Else `REVIEW_LOCKED`.

#### `GET /api/v1/reviews` — public
Paginated, newest first, `is_hidden = false` only. Optional `?menu_item_id=…`.
```json
{ "data":[ { "id":"…","rating":5,"comment":"Best roll on campus.",
  "reviewer_name":"Heet C.","items":["Paneer Tikka Roll"],
  "created_at":"2026-09-11T09:00:00Z" } ],
  "meta":{"page":1,"page_size":20,"total":57,"total_pages":3} }
```
> `reviewer_name` is **built server-side** as first name + last initial. Never send email or phone to a public endpoint.

#### `GET /api/v1/reviews/summary` — public
```json
{ "data": { "average":4.6,"total":57,
  "distribution":{"5":38,"4":12,"3":5,"2":1,"1":1} }}
```

---

### 5.7 Admin — all require `ADMIN` or `STAFF` unless noted

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/admin/orders` | STAFF+ | Order queue; `?status=`, `?date=`, `?location_id=` |
| `PATCH` | `/admin/orders/{id}/status` | STAFF+ | Advance status |
| `POST` | `/admin/orders/{id}/cancel` | ADMIN | Cancel with reason |
| `GET` | `/admin/menu/items` | STAFF+ | All items incl. inactive |
| `POST` | `/admin/menu/items` | ADMIN | Create item |
| `PATCH` | `/admin/menu/items/{id}` | ADMIN | Edit item |
| `PATCH` | `/admin/menu/items/{id}/availability` | **STAFF+** | Sold-out toggle |
| `DELETE` | `/admin/menu/items/{id}` | ADMIN | Soft-delete (`is_active=false`) |
| `POST` | `/admin/menu/categories` | ADMIN | Create category |
| `PATCH` | `/admin/menu/categories/{id}` | ADMIN | Edit/reorder |
| `POST` | `/admin/menu/upload-url` | ADMIN | Presigned S3 upload URL |
| `GET` | `/admin/users` | ADMIN | List; `?search=`, `?role=` |
| `PATCH` | `/admin/users/{id}` | ADMIN | Change role / activate / deactivate |
| `GET` | `/admin/slots` | STAFF+ | Slots for a date |
| `POST` | `/admin/slots` | ADMIN | Create slot |
| `POST` | `/admin/slots/bulk` | ADMIN | Generate a week of slots |
| `PATCH` | `/admin/slots/{id}` | ADMIN | Edit capacity / deactivate |
| `PATCH` | `/admin/locations/{id}` | ADMIN | Per-location delivery toggle |
| `PATCH` | `/admin/settings` | ADMIN | Global delivery / kitchen / announcement |
| `PATCH` | `/admin/reviews/{id}/hide` | ADMIN | Hide a review |
| `GET` | `/admin/stats` | ADMIN | Dashboard counters |

> **Staff can toggle availability but cannot edit prices.** That split is the whole reason `STAFF` exists as a separate role — the counter person needs the sold-out switch several times a day and should not be able to change what things cost.

#### `PATCH /admin/orders/{id}/status`
```json
{ "status": "PREPARING", "note": "" }
```
Validated against the transition table (§7). Writes an `order_status_events` row with `actor_id`. On `DELIVERED`, sets `delivered_at` and, for COD, `payment_status = PAID`.

#### `GET /admin/stats`
```json
{ "data": { "orders_today":42,"revenue_today_paise":504000,
  "active_orders":7,"pending_review_count":3,
  "top_items":[{"name":"Paneer Tikka Roll","count":18}],
  "orders_by_status":{"PLACED":2,"PREPARING":3,"READY":2} }}
```

---

## 6. Short code generation

Human-speakable order IDs — `RIT-A47`. Staff call these out; UUIDs are unusable aloud.

```
RIT-<letter><2 digits>   e.g. RIT-A47
```
Generate from a daily sequence: letter cycles A–Z, number 00–99, resetting daily (2,600 orders/day headroom). Use a Postgres sequence or a `daily_counters` table incremented in the same transaction. **Must be unique** — the column has a UNIQUE constraint; on collision, retry once then fail.

Avoid letters `I` and `O` (confused with 1 and 0 when spoken).

---

## 7. Order status transition table

Enforce in `service/order.go`. Anything not listed is `INVALID_TRANSITION`.

| From | Allowed to | Who |
|---|---|---|
| `PLACED` | `ACCEPTED` | STAFF, ADMIN |
| `PLACED` | `CANCELLED_BY_USER` | owner, within deadline |
| `PLACED` | `CANCELLED_BY_ADMIN` | ADMIN |
| `ACCEPTED` | `PREPARING` | STAFF, ADMIN |
| `ACCEPTED` | `CANCELLED_BY_ADMIN` | ADMIN |
| `PREPARING` | `READY` | STAFF, ADMIN |
| `READY` | `OUT_FOR_DELIVERY` | STAFF, ADMIN |
| `OUT_FOR_DELIVERY` | `DELIVERED` | STAFF, ADMIN |
| `DELIVERED` | — | terminal |
| `CANCELLED_*` | — | terminal |

```go
var allowed = map[domain.Status][]domain.Status{
    domain.StatusPlaced:   {domain.StatusAccepted, domain.StatusCancelledUser, domain.StatusCancelledAdmin},
    domain.StatusAccepted: {domain.StatusPreparing, domain.StatusCancelledAdmin},
    domain.StatusPreparing:{domain.StatusReady},
    domain.StatusReady:    {domain.StatusOutForDelivery},
    domain.StatusOutForDelivery: {domain.StatusDelivered},
}
```

**Cancellation releases the slot:** any transition into a `CANCELLED_*` state must decrement `slot.booked_count` in the same transaction. Forgetting this leaks capacity — the slot shows full while the kitchen sits idle.

---

## 8. Middleware chain

Order matters:
```go
r.Use(middleware.RequestID)
r.Use(middleware.RealIP)
r.Use(middleware.Logger)       // structured JSON: request_id, method, path, status, duration_ms, user_id
r.Use(middleware.Recoverer)    // panic → 500 INTERNAL, never leak the stack
r.Use(middleware.CORS)
r.Use(middleware.Timeout(30 * time.Second))
```
Then per-group: `RateLimit` on `/auth/*`, `Authenticate` on protected, `RequireRole` on `/admin/*`.

**Logging rule:** log the `request_id` on every line and return it in every error. When a user reports a problem, that ID finds the exact request. **Never log** passwords, tokens, or password hashes.

---

## 9. Testing requirements

Minimum bar before a PR merges:

| Area | Test |
|---|---|
| Slot capacity | 50 concurrent orders, capacity 10 → exactly 10 succeed |
| Price integrity | Client sends `price_paise: 1` → server ignores it |
| Ownership | User A requests User B's order → 404 |
| Role guard | CUSTOMER hits every `/admin/*` route → 403 |
| Staff limits | STAFF attempts price edit → 403 |
| Transitions | Every illegal pair → `INVALID_TRANSITION` |
| Cancel releases slot | Cancel → `booked_count` decrements |
| Review gating | Review a non-delivered order → `REVIEW_NOT_ALLOWED` |
| Auth | Expired token → `TOKEN_EXPIRED`; reused refresh → family revoked |
| Money | No float anywhere; totals exact |

Use `testcontainers-go` for a real Postgres in integration tests. Mocking the DB hides exactly the concurrency bugs that matter here.

---

## 10. Makefile

```make
run:        ## hot reload
	air
build:
	go build -o bin/api ./cmd/api
migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up
migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1
migrate-new:
	migrate create -ext sql -dir migrations -seq $(name)
seed:
	go run ./seed
test:
	go test ./... -race -count=1
test-int:
	go test ./... -tags=integration -race
lint:
	golangci-lint run
```

`-race` is mandatory in CI. This codebase has real concurrency.
