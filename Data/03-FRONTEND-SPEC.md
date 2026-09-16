# Roll-IT — Frontend Engineering Spec

**Audience:** Frontend engineer
**Prerequisites:** `01-HLD.md`, `02-LLD.md` (API contract), `04-DESIGN-SYSTEM.md`
**Stack:** Next.js 14+ App Router · TypeScript (strict) · Tailwind · TanStack Query · Zustand
**Version:** 1.0 · September 2026

Every page below specifies its route, guard, data, components, states, and error handling. Where this spec names an endpoint or error code, it matches the LLD exactly.

---

## 1. Project structure

```
roll-it-web/
├── app/
│   ├── layout.tsx                 # fonts, providers, toaster
│   ├── page.tsx                   # / — Welcome
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx             # requires auth; nav shell
│   │   ├── home/page.tsx
│   │   ├── menu/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx      # location + slot + confirm
│   │   ├── orders/
│   │   │   ├── page.tsx           # list
│   │   │   └── [id]/page.tsx      # status
│   │   ├── review/[orderId]/page.tsx
│   │   └── reviews/page.tsx       # public wall
│   └── admin/
│       ├── layout.tsx             # requires ADMIN|STAFF
│       ├── page.tsx               # dashboard
│       ├── menu/page.tsx
│       ├── orders/page.tsx
│       ├── users/page.tsx
│       └── slots/page.tsx
├── components/
│   ├── ui/                        # Button, Input, Card, Toggle, Toast, Modal…
│   ├── menu/                      # MenuItemCard, CategoryTabs, QuantityStepper
│   ├── order/                     # OrderStatusStepper, OrderSummary, OrderCard
│   ├── review/                    # StarRating, ReviewCard
│   └── layout/                    # Header, BottomNav, StickyCartBar
├── lib/
│   ├── api/
│   │   ├── client.ts              # fetch wrapper, refresh-on-401
│   │   ├── auth.ts  menu.ts  orders.ts  slots.ts  reviews.ts  admin.ts
│   ├── hooks/                     # useAuth, useCart, useMenu, useOrder…
│   ├── store/cart.ts              # Zustand + localStorage
│   ├── utils/format.ts            # money, date, phone
│   └── validation/schemas.ts      # Zod, mirrors backend rules
├── types/api.ts                   # generated or hand-written from LLD
└── mocks/                         # MSW handlers — unblocks work before API exists
```

**Start with MSW mocks on day one.** The LLD contract is frozen, so every page can be built and reviewed before a single backend endpoint is live.

---

## 2. State management split

| Kind | Tool | Examples |
|---|---|---|
| Server state | TanStack Query | menu, orders, slots, reviews, user |
| Cart | Zustand + localStorage | items and quantities |
| Auth | React Context + memory | access token, user object |
| Form | react-hook-form + Zod | all forms |
| UI | local `useState` | modals, tabs, accordions |

**The access token lives in memory only** (a module variable), never `localStorage`. The refresh token is an httpOnly cookie the JS never touches. On app mount, call `GET /auth/me`; a 401 means refresh, and if that fails, the user is logged out.

### Cart store

```ts
// lib/store/cart.ts
interface CartItem { menuItemId: string; name: string; pricePaise: number;
                     quantity: number; imageUrl?: string; isVeg: boolean }
interface CartState {
  items: CartItem[]
  add(item: Omit<CartItem,'quantity'>): void
  setQuantity(id: string, qty: number): void   // qty 0 removes
  remove(id: string): void
  clear(): void
  subtotalPaise(): number                       // display only
  count(): number
}
```

Persisted to `localStorage` under `rollit_cart_v1` with `zustand/middleware`.

> **The cart's prices are for display only.** Every total that matters comes from `POST /cart/validate` or the order response. If the admin changes a price while an item sits in someone's cart, the server total wins and the UI must show the server's number. Never submit prices to the server.

### API client

```ts
// lib/api/client.ts — behavior contract
// 1. Attach Authorization: Bearer <token> if present
// 2. credentials: 'include' so the refresh cookie travels
// 3. On 401 with code TOKEN_EXPIRED:
//      → call POST /auth/refresh ONCE
//      → on success, retry the original request
//      → on failure, clear auth, redirect to /login?next=<current>
// 4. Concurrent 401s share ONE refresh promise — never fire N refreshes
// 5. Parse the error envelope into a typed ApiError { code, message, details }
// 6. Never throw a raw fetch error to a component; always ApiError
```

Point 4 is the one people miss. Three queries failing at once on a stale token will otherwise trigger three refreshes, two of which present an already-rotated token, and the backend revokes the whole family as theft. The user gets logged out at random.

---

## 3. Route guards

```
/                          public   (redirects to /home if logged in)
/login  /register          public   (redirects to /home if logged in)
/home /menu /cart          auth
/checkout /orders/*        auth
/review/* /reviews         auth
/admin/*                   role ∈ { ADMIN, STAFF }
```

Guard in the segment `layout.tsx`. While the auth check is in flight, render a skeleton — **never flash the login page** at an already-authenticated user.

Unauthenticated access to a protected route → `/login?next=/cart`, and login returns them there.

`/admin` routes hide ADMIN-only controls from STAFF, **and** the backend enforces it again. UI hiding is convenience, not security.

---

## 4. Pages

### 4.1 Welcome — `/`

**Purpose:** brand landing for logged-out visitors.
**Guard:** public; redirect to `/home` if authenticated.

**Layout:** full-bleed cream background, centered.

```
┌──────────────────────────────┐
│         [Roll-IT logo]       │  240px wide, SVG
│                              │
│   A roll that makes you      │  display-md, brown
│        feel whole.           │
│                              │
│   Fresh rolls delivered to   │  body-lg, ink-muted
│   LJ, TTECH and Strata.      │
│                              │
│   [    Get started    ]      │  primary lg, → /register
│   [      Log in       ]      │  secondary lg, → /login
│                              │
│   ★ 4.6 from 57 reviews →    │  ghost, → /reviews
└──────────────────────────────┘
```

**Data:** `GET /reviews/summary` — public, non-blocking. If it fails, hide the rating line entirely rather than showing an error; this page must always render.

**Notes:** the logo is the hero — give it room. No nav bar. Reachable without JS (server component).

---

### 4.2 Register — `/register`

**Guard:** public; redirect if authed.

**Fields** (all required, in this order):

| Field | Type | Validation (Zod, mirrors LLD §5.1) |
|---|---|---|
| `name` | text | 2–60 chars, trimmed |
| `email` | email | valid format, lowercased on submit |
| `phone` | tel | exactly 10 digits, starts 6–9 |
| `password` | password | ≥8 chars, ≥1 letter, ≥1 digit |
| `confirmPassword` | password | must equal `password` |

```ts
export const registerSchema = z.object({
  name: z.string().trim().min(2,'Name is too short').max(60),
  email: z.string().email('Enter a valid email').transform(s => s.toLowerCase()),
  phone: z.string()
    .transform(s => s.replace(/\D/g,'').replace(/^91/,''))   // strip +91, spaces
    .refine(s => /^[6-9]\d{9}$/.test(s), 'Enter a valid 10-digit mobile number'),
  password: z.string().min(8,'At least 8 characters')
    .regex(/[A-Za-z]/,'Must include a letter').regex(/\d/,'Must include a number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword,
  { message:"Passwords don't match", path:['confirmPassword'] })
```

**Behavior**
- Validate on blur, re-validate on change once a field has errored. Don't error while someone is still typing their first character.
- Phone input: `inputMode="numeric"`, `autoComplete="tel"`, prefix `+91` shown as static text outside the input.
- Password: show/hide toggle; strength hint below.
- Submit: button shows a spinner, form disabled.

**On success:** store token, redirect to `/home` with a toast "Welcome to Roll-IT."

**Error handling**

| Code | UI |
|---|---|
| `EMAIL_TAKEN` | Inline under email: "This email is already registered. Log in?" with a link |
| `PHONE_TAKEN` | Inline under phone, same pattern |
| `VALIDATION_ERROR` | Map `details` field→message onto the matching inputs |
| `RATE_LIMITED` | Toast: "Too many attempts. Try again in a few minutes." |
| network | Toast with retry |

Footer: "Already have an account? Log in".

---

### 4.3 Login — `/login`

**Guard:** public; redirect if authed.
**One page for customers and admins** (HLD §5) — no separate admin login.

**Fields**
| Field | Validation |
|---|---|
| `identifier` | non-empty; label "Email or phone" |
| `password` | non-empty |

```ts
export const loginSchema = z.object({
  identifier: z.string().trim().min(1,'Enter your email or phone'),
  password: z.string().min(1,'Enter your password'),
})
```
Do not validate the identifier's *format* client-side — the backend decides email vs phone. Rejecting something the server would have accepted is worse than one round trip.

**On success — role-based redirect:**
```ts
const dest = ['ADMIN','STAFF'].includes(user.role)
  ? '/admin'
  : (searchParams.next ?? '/home')
```

**Errors**

| Code | UI |
|---|---|
| `INVALID_CREDENTIALS` | Form-level (not per-field): "Email/phone or password is incorrect." |
| `RATE_LIMITED` | "Too many attempts. Try again in {Retry-After}." Disable submit with a countdown. |

> Never show "no account with that email" — it lets anyone test which emails are registered. Keep the message identical for unknown user and wrong password.

Links: "Create an account", and a "Forgot password?" that is **visibly disabled with a tooltip "Contact the kitchen to reset"** in v1 — a dead link that 404s is worse than an honest disabled one.

---

### 4.4 Home — `/home`

**Guard:** auth.

```
┌────────────────────────────────────┐
│ [logo]              [🔔] [avatar]  │  header
├────────────────────────────────────┤
│  Hey Heet 👋                       │  display-sm
│  Hungry? Kitchen's open till 9pm.  │  ink-muted
├────────────────────────────────────┤
│  ⚠ Announcement banner (if any)    │  warning-bg, dismissible
├────────────────────────────────────┤
│  ┌──────── ACTIVE ORDER ────────┐  │  only if one exists
│  │ RIT-A47 · Preparing          │  │
│  │ ●━━●━━○──○  arriving 1:00pm  │  │
│  │              [Track order →] │  │
│  └──────────────────────────────┘  │
├────────────────────────────────────┤
│  Popular right now                 │
│  [card] [card] [card]  →           │  horizontal scroll
├────────────────────────────────────┤
│  [    Browse full menu    ]        │  primary lg
├────────────────────────────────────┤
│  What people say  ★4.6             │
│  [review] [review]  →              │
└────────────────────────────────────┘
```

**Data**
- `GET /orders?status=active` → active-order card; poll every 30s while one exists
- `GET /menu` → top 6 by `rating_count`
- `GET /reviews?page_size=3`
- `GET /menu` also supplies `announcement`, `kitchen_open`, `delivery_enabled`

**States**
- Kitchen closed: replace the CTA with a muted "Kitchen's closed right now" card; menu stays browsable.
- No active order: omit that card entirely — no empty placeholder.
- Loading: skeletons matching final layout (prevents layout shift).

---

### 4.5 Menu — `/menu`

The most-used page. Optimize it hardest.

```
┌────────────────────────────────────┐
│ ← Menu                      [🔍]   │
├────────────────────────────────────┤
│ [All][Veg Rolls][Non-Veg][Sides]   │  sticky tabs, horizontal scroll
│ [🟩 Veg only]                      │  filter chip
├────────────────────────────────────┤
│ VEG ROLLS                          │
│ ┌────────────────────────────────┐ │
│ │[img] 🟩 Paneer Tikka Roll      │ │
│ │      Grilled paneer, mint mayo │ │
│ │      ★4.5(23)  ₹120    [Add]   │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │[img] 🟩 Aloo Roll     SOLD OUT │ │  opacity .55, greyscale
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ 🛒 3 items · ₹360      [View cart] │  sticky bottom, if cart non-empty
└────────────────────────────────────┘
```

**Data:** `GET /menu` — single call, all categories. `staleTime: 60_000`.

**Behavior**
- Category tabs scroll-spy to sections; tapping scrolls smoothly.
- Search filters client-side across name and description (the menu is small; no server search).
- Veg filter is a client-side toggle.
- `Add` → optimistically add to cart, button morphs into `[− 1 +]` in place.
- Sold-out items are **visible, disabled, greyed** — never hidden (HLD §7).
- Sticky bottom cart bar appears when the cart is non-empty; respects safe-area inset.

**States**

| State | UI |
|---|---|
| Loading | 6 skeleton cards |
| Empty menu | "Menu's being updated. Check back soon." |
| Category empty after filter | "No veg items in this category." |
| `delivery_enabled: false` | Sticky warning banner: "Kitchen's closed — you can browse but not order." Add buttons stay enabled so a cart can be built; checkout is what blocks. |
| Error | Full-page error with Retry |

**Performance**
- `next/image` with `sizes`, `placeholder="blur"`
- Lazy-load below-fold images
- Virtualize only if items exceed ~100 (they won't at v1)

---

### 4.6 Cart — `/cart`

**Guard:** auth.

```
┌────────────────────────────────────┐
│ ← Your cart                        │
├────────────────────────────────────┤
│ ⚠ Paneer Roll just sold out.       │  error-bg, if unavailable_items
│   [Remove it and continue]         │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │[img] Paneer Tikka Roll         │ │
│ │      ₹120 each                 │ │
│ │      [− 2 +]    ₹240    [🗑]   │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Add a note (optional)              │
│ ┌────────────────────────────────┐ │  max 200 chars, counter
│ │ less spicy                     │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Subtotal              ₹360         │
│ Delivery               FREE        │
│ ─────────────────────────────      │
│ Total                 ₹360         │  price style, bold
├────────────────────────────────────┤
│ [      Proceed to checkout     ]   │  primary lg, sticky
└────────────────────────────────────┘
```

**Data:** `POST /cart/validate` on mount and after every quantity change (debounced 400ms).

> All displayed totals come from the validate response, **not** from the local store's arithmetic. The local subtotal is a placeholder shown only while the first validate is in flight.

**Behavior**
- Quantity 1–20; at 1 the minus button becomes a delete.
- Removing an item shows an undo toast for 5s.
- If `unavailable_items` is non-empty: banner listing them, that row marked sold out, and **checkout disabled** until they're removed.
- If `delivery_enabled: false`: checkout disabled with an explanatory banner.
- Note field: 200-char limit with a live counter.

**States**

| State | UI |
|---|---|
| Empty | Illustration + "Your cart is empty. Let's fix that." + [Browse menu] |
| Validating | Totals row shimmers; checkout disabled |
| Items unavailable | Banner + disabled checkout |
| Delivery off | Banner + disabled checkout |

---

### 4.7 Checkout: location, slot, confirm — `/checkout`

Three steps in one page, progressively revealed. Do not split across routes — a back button mid-checkout loses state and is a known drop-off point.

```
┌────────────────────────────────────┐
│ ← Checkout          Step 1 of 3    │
├────────────────────────────────────┤
│ ① WHERE                            │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │  LJ  │ │TTECH │ │Strata│        │  radio cards
│ │  ✓   │ │      │ │ Paused│       │  disabled if !delivery_enabled
│ └──────┘ └──────┘ └──────┘        │
├────────────────────────────────────┤
│ ② WHEN                             │  revealed after location
│ Today ▾                            │
│ ┌────────┐┌────────┐┌────────┐    │
│ │ 1:00pm ││ 1:30pm ││ 2:00pm │    │
│ │2 left  ││  Full  ││Closed  │    │
│ └────────┘└────────┘└────────┘    │
├────────────────────────────────────┤
│ ③ CONFIRM                          │  revealed after slot
│ 2× Paneer Tikka Roll      ₹240     │
│ 1× Coke                    ₹40     │
│ Note: less spicy                   │
│ ──────────────────────────────     │
│ Total                     ₹280     │
│ Payment: Cash on delivery          │
├────────────────────────────────────┤
│ [       Place order        ]       │  primary lg, sticky
└────────────────────────────────────┘
```

**Data**
- `GET /locations` on mount
- `GET /slots?location_id=&date=` when location changes — **refetch every 30s** while the page is open, because slots fill up while the user decides
- `POST /cart/validate` with `location_id` for the final total
- `POST /orders` on submit

**Slot rendering** — the API returns all slots with a reason (LLD §5.3):

| `unavailable_reason` | Label | Style |
|---|---|---|
| `null` | "{n} left" (or nothing if >5) | enabled |
| `FULL` | "Full" | disabled, line bg |
| `CUTOFF_PASSED` | "Closed" | disabled |
| `DELIVERY_DISABLED` | "Unavailable" | disabled |

Showing *why* a slot is disabled prevents the "where did the 1pm slot go" question.

**Submit error handling — this is the highest-stakes error surface in the app:**

| Code | UI |
|---|---|
| `SLOT_FULL` | Toast "That slot just filled up." Refetch slots, clear selection, scroll to step ②. **Do not lose the cart.** |
| `SLOT_EXPIRED` | Same, message "Ordering for that slot has closed." |
| `ITEMS_UNAVAILABLE` | Modal listing the items, [Remove and continue] → back to `/cart` |
| `DELIVERY_DISABLED` | Modal "Kitchen just closed." → `/home` |
| `VALIDATION_ERROR` | Map to fields |
| network/500 | Toast + retry. **Never silently retry a POST /orders** — a duplicate order is worse than an error message. |

**On success:** `router.replace('/orders/{id}?new=true')` — `replace`, not `push`, so back doesn't return to checkout.

---

### 4.8 Order status — `/orders/[id]`

**Guard:** auth + ownership (a 404 from the API means show not-found, not an error).

```
┌────────────────────────────────────┐
│ ← Order RIT-A47                    │
├────────────────────────────────────┤
│  🎉 Order placed. We're on it.     │  only when ?new=true
├────────────────────────────────────┤
│         PREPARING                  │  display-sm, primary
│    Arriving 1:00–1:30pm at LJ      │
│                                    │
│   ●━━━━●━━━━◉────○────○           │  stepper
│  Placed Acc. Prep. Ready Delivered │
├────────────────────────────────────┤
│  [  Cancel order  ]  02:00 ⏱      │  only while can_cancel
├────────────────────────────────────┤
│ ITEMS                              │
│ 2× Paneer Tikka Roll      ₹240     │
│ 1× Coke                    ₹40     │
│ Note: less spicy                   │
│ ──────────────────────────────     │
│ Total                     ₹280     │
│ Cash on delivery · Pending         │
├────────────────────────────────────┤
│ [    Rate your order    ]          │  only when can_review
└────────────────────────────────────┘
```

**Data:** `GET /orders/{id}`, **polled every 15s while the status is non-terminal.** Stop polling on `DELIVERED` or any `CANCELLED_*`. Also stop when the tab is hidden (`document.visibilityState`) and refetch on focus — polling a background tab for an hour drains battery for nothing.

```ts
useQuery({
  queryKey: ['order', id],
  queryFn: () => api.orders.get(id),
  refetchInterval: (q) => isTerminal(q.state.data?.status) ? false : 15_000,
  refetchIntervalInBackground: false,
})
```

**Cancel button**
- Rendered only when `can_cancel` is true (server-computed — LLD §5.5).
- Countdown from `cancel_deadline_at`; when it hits zero, hide the button and refetch.
- Confirmation modal before cancelling.
- `CANCEL_WINDOW_PASSED` → toast "Too late to cancel — the kitchen already started." + refetch.

**Status-specific copy**

| Status | Headline | Sub |
|---|---|---|
| `PLACED` | "Order placed" | "Waiting for the kitchen to accept." |
| `ACCEPTED` | "Accepted" | "The kitchen has your order." |
| `PREPARING` | "Preparing" | "Your rolls are on the grill." |
| `READY` | "Ready" | "Packed and waiting to go out." |
| `OUT_FOR_DELIVERY` | "On the way" | "Arriving at {location} by {time}." |
| `DELIVERED` | "Delivered" | "Hope it hit the spot." |
| `CANCELLED_BY_USER` | "Cancelled" | "You cancelled this order." |
| `CANCELLED_BY_ADMIN` | "Cancelled by kitchen" | Shows `cancel_reason`. |

---

### 4.9 Orders list — `/orders`

Tabs: **Active** / **Past**.

Active tab = non-terminal orders, polled every 30s. Each row is an `OrderCard`: short code, status pill, item count, total, slot time, chevron.

Past tab = paginated (20/page), infinite scroll or a Load more button. Delivered orders without a review show a `[Rate]` button inline.

Empty states: "No active orders — Browse the menu →" and "No past orders yet."

---

### 4.10 Give review — `/review/[orderId]`

**Guard:** auth + the order is the caller's + status `DELIVERED` + no existing review. Any failure → redirect to the order page with an explanatory toast.

```
┌────────────────────────────────────┐
│ ← Rate your order                  │
├────────────────────────────────────┤
│ RIT-A47 · 2 items · ₹280           │
│ Paneer Tikka Roll, Coke            │
├────────────────────────────────────┤
│ How was it?                        │
│      ★  ★  ★  ★  ★                │  44px targets
│           Loved it                 │  label updates with selection
├────────────────────────────────────┤
│ Tell us more (optional)            │
│ ┌────────────────────────────────┐ │
│ │                                │ │  max 500, counter
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ [      Submit review       ]       │
└────────────────────────────────────┘
```

Rating labels: 1 "Not good" · 2 "Could be better" · 3 "Decent" · 4 "Really good" · 5 "Loved it".

Rating is required; submit stays disabled at 0. Comment optional, 500 max.

**Edit mode:** if a review exists and `now < editable_until`, the same page prefills and `PATCH`es instead, with a "You can edit this for the next {n} hours" note. Past the window → `REVIEW_LOCKED` → show the review read-only.

**Accessibility:** the star group is a `radiogroup`; arrow keys move, Space selects, each star has `aria-label="{n} stars"`.

On success: toast "Thanks for the review." → `/reviews`.

---

### 4.11 See reviews — `/reviews`

```
┌────────────────────────────────────┐
│ ← Reviews                          │
├────────────────────────────────────┤
│    4.6 ★★★★★    57 reviews        │
│    5 ████████████████ 38           │  distribution bars
│    4 ██████ 12                     │
│    3 ██ 5                          │
│    2 ▌1     1 ▌1                   │
├────────────────────────────────────┤
│ [All ▾] [Newest ▾]                 │  filter: rating; sort
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ Heet C.        ★★★★★  2d ago   │ │
│ │ Best roll on campus.           │ │
│ │ Paneer Tikka Roll              │ │  item chips
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│        [  Load more  ]             │
└────────────────────────────────────┘
```

**Data:** `GET /reviews/summary` + `GET /reviews?page=&rating=`.

Distribution bars are proportional to the max count, not to the total — otherwise low counts are invisible. Each bar is a button filtering to that rating.

Empty: "No reviews yet. Be the first."

---

## 5. Admin pages

Shared `/admin/layout.tsx`: sidebar (desktop) / bottom tabs (mobile) — Dashboard, Orders, Menu, Slots, Users. Users is ADMIN-only and hidden for STAFF.

### 5.1 Dashboard — `/admin`

Four stat tiles (orders today, revenue today, active orders, avg rating), a live order queue preview, and two prominent global toggles:

```
┌─────────────────────────────────────┐
│  Delivery       [ ●───]  ON         │  app_settings.delivery_enabled
│  Kitchen open   [ ●───]  ON         │  app_settings.kitchen_open
└─────────────────────────────────────┘
```

These are the highest-consequence controls in the app — **turning delivery off blocks all checkout**. Each requires a confirmation modal naming the effect: "Turn delivery off? Customers won't be able to place orders." Optimistic with rollback on failure.

Data: `GET /admin/stats`, refetched every 60s.

### 5.2 Order queue — `/admin/orders`

The page kitchen staff keep open all service. Design for glanceability.

Columns as status lanes (Placed / Accepted / Preparing / Ready / Out): each card shows short code, items, slot time, location, customer name, and one primary action advancing it to the next status.

- **Poll every 10s** — this is the one place where fast updates matter.
- Audio ping on a new `PLACED` order (user-toggleable, off by default; browsers block autoplay until the user interacts with the page).
- Filters: date, location, status.
- Advancing calls `PATCH /admin/orders/{id}/status`, optimistic with rollback.
- `INVALID_TRANSITION` → toast + refetch (means someone else already moved it).
- ADMIN-only: cancel with a required reason.

### 5.3 Menu editor — `/admin/menu`

Table of items grouped by category. Per row:

| Control | Role | Notes |
|---|---|---|
| Availability toggle | **STAFF+** | The most-used control. Optimistic, instant. |
| Edit (name/desc/price/image/category) | ADMIN | Modal form |
| Soft delete | ADMIN | Confirmation; sets `is_active=false` |
| Reorder | ADMIN | Drag handle |

STAFF sees edit/delete controls **disabled with a tooltip**, not hidden — so staff understand the control exists and who can use it.

Image upload: `POST /admin/menu/upload-url` → presigned PUT direct to S3 → save the returned URL. Client-side: ≤2MB, jpeg/png/webp, preview with crop to 4:3.

Category management in a side panel: create, rename, reorder, activate/deactivate.

### 5.4 Slots — `/admin/slots`

Week grid: rows = locations, columns = days, cells = slots with `booked/capacity`.

- Create one slot, or **bulk-generate** a week (`POST /admin/slots/bulk`) — the realistic workflow is "same slots every weekday".
- Edit capacity inline. **Capacity cannot be set below `booked_count`** — validate client-side with a clear message, and the backend rejects it too.
- Per-location delivery toggle here as well as on the dashboard.

### 5.5 Users — `/admin/users` (ADMIN only)

Table: name, email, phone, role, orders count, joined, status. Search by name/email/phone; filter by role.

Actions: change role (confirmation, since promoting to ADMIN is consequential), activate/deactivate.

**An admin cannot deactivate or demote their own account** — disable those controls on their own row. Otherwise the last admin can lock everyone out, and recovery means a manual DB edit.

---

## 6. Cross-cutting requirements

### Loading
Skeletons matching the final layout, never spinners for page loads. A spinner tells the user nothing about what's coming; a skeleton prevents layout shift.

### Errors
- Field errors inline.
- Action errors as toasts.
- Page-load failures as a full-page error with Retry.
- `ErrorBoundary` per route segment; a crashed card must not white-screen the app.

### Offline
Detect `navigator.onLine`; show a persistent banner. Queue nothing — a food order placed from a stale offline queue is worse than a failed one.

### Analytics events
`register_completed` · `login` · `menu_viewed` · `item_added` · `checkout_started` · `slot_selected` · `order_placed` · `order_cancelled` · `review_submitted`.

### Performance budget
LCP < 2.5s on 4G · bundle < 200KB gzipped first load · images WebP under 100KB · `next/font` with `display: swap`.

### SEO
Only `/` and `/reviews` are indexable. Everything else `noindex` — an order status page has no business in search results. OG tags on the welcome page.

---

## 7. Definition of done (per page)

- [ ] Matches the design system (tokens, no hardcoded hex)
- [ ] Responsive at 375 / 768 / 1280
- [ ] Loading, empty, error, and success states all implemented
- [ ] Every API error code from the LLD handled with specific copy
- [ ] Keyboard navigable; visible focus rings
- [ ] Screen-reader tested on the main flow
- [ ] No `any` in TypeScript
- [ ] Works with the backend down (graceful errors, no white screen)
- [ ] Touch targets ≥44px
- [ ] Money formatted via the shared util, never inline arithmetic
