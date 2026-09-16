# Roll-IT — Design System

**Audience:** Frontend engineer, Designer
**Version:** 1.0 · September 2026

Derived directly from the Roll-IT logo. Colors below were sampled from the logo file, not guessed.

---

## 1. Color

### Brand colors (sampled from logo)

| Token | Hex | Source |
|---|---|---|
| `cream` | `#FDF0E0` | Logo background |
| `brown` | `#45260A` | "Roll-" script |
| `orange` | `#CC5E0F` | "IT" + arc accent |

### ⚠️ Contrast warning — read before using orange

Measured WCAG contrast ratios:

| Combination | Ratio | Verdict |
|---|---|---|
| `#CC5E0F` on white | **4.06:1** | ❌ Fails AA for body text (needs 4.5) |
| `#CC5E0F` on cream | **3.62:1** | ❌ Fails AA for body text |
| `#B54F0A` on white | **5.14:1** | ✅ Passes AA |
| `#A34509` on white | **6.15:1** | ✅ Passes AA |
| `#45260A` on cream | **12.2:1** | ✅ Passes AAA |

**Rules, not suggestions:**

- The logo orange `#CC5E0F` is for **button fills, large headings (24px+), icons, and decorative accents only**.
- For **orange text at body size**, use `#B54F0A` (`--color-primary-600`).
- **White text on orange fill** is fine — the fill is large enough to count as a graphical object, and button labels are ≥16px semibold.
- Never put `#CC5E0F` text on the cream background. It measures 3.62:1 and will fail an accessibility audit.

### Full palette

```css
:root {
  /* Brand */
  --color-primary-50:  #FEF6EE;
  --color-primary-100: #FDEAD7;
  --color-primary-200: #FAD1AE;
  --color-primary-300: #F7B17A;
  --color-primary-400: #F28744;
  --color-primary-500: #CC5E0F;  /* logo orange — fills & large text */
  --color-primary-600: #B54F0A;  /* orange TEXT at body size */
  --color-primary-700: #A34509;  /* hover / high contrast */
  --color-primary-800: #7C340B;
  --color-primary-900: #45260A;  /* logo brown */

  /* Neutrals — warm-tinted to sit with the cream, never pure grey */
  --color-cream:       #FDF0E0;  /* app background */
  --color-cream-light: #FFF8EF;  /* card background */
  --color-surface:     #FFFFFF;
  --color-border:      #EADDCB;
  --color-border-strong:#D9C7AE;
  --color-text:        #2B1708;  /* primary text */
  --color-text-muted:  #6B4A2A;  /* 7.09:1 on cream ✅ */
  --color-text-subtle: #8A6A46;  /* 4.42:1 — LARGE text only */

  /* Semantic — darkened to pass AA on white */
  --color-success:     #1B7F3B;  /* 5.07:1 ✅ */
  --color-success-bg:  #E8F5ED;
  --color-warning:     #8A5A00;  /* 5.93:1 ✅ */
  --color-warning-bg:  #FEF5E0;
  --color-error:       #C0261A;  /* 5.94:1 ✅ */
  --color-error-bg:    #FDECEA;
  --color-info:        #1A5FA8;
  --color-info-bg:     #E8F1FB;

  /* Veg/non-veg — Indian FSSAI convention, legally expected on menus */
  --color-veg:         #0A8043;
  --color-nonveg:      #9B2C2C;
}
```

**Dark mode is out of scope for v1.** A food menu is viewed in daylight on a phone; shipping one well-tested light theme beats two half-tested ones. If added later, redefine only the tokens above.

### Tailwind config

```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50:'#FEF6EE',100:'#FDEAD7',200:'#FAD1AE',300:'#F7B17A',
          400:'#F28744',500:'#CC5E0F',600:'#B54F0A',700:'#A34509',
          800:'#7C340B',900:'#45260A',
        },
        cream: { DEFAULT:'#FDF0E0', light:'#FFF8EF' },
        ink:   { DEFAULT:'#2B1708', muted:'#6B4A2A', subtle:'#8A6A46' },
        line:  { DEFAULT:'#EADDCB', strong:'#D9C7AE' },
        veg:'#0A8043', nonveg:'#9B2C2C',
        success:'#1B7F3B', warning:'#8A5A00', error:'#C0261A', info:'#1A5FA8',
      },
      fontFamily: {
        display: ['var(--font-display)','Georgia','serif'],
        sans:    ['var(--font-sans)','system-ui','sans-serif'],
      },
      borderRadius: { card:'16px', btn:'12px', pill:'999px' },
      boxShadow: {
        card:'0 1px 3px rgba(43,23,8,.08), 0 1px 2px rgba(43,23,8,.04)',
        'card-hover':'0 4px 12px rgba(43,23,8,.10)',
        sticky:'0 -2px 12px rgba(43,23,8,.08)',
      },
    },
  },
}
```

---

## 2. Typography

The logo pairs a **script** wordmark with a clean sans subtitle. Reproducing the script in UI text would hurt legibility, so:

- **Display font** (`Fraunces` or `Playfair Display`, 600/700): page titles, section headings, the wordmark. Carries the logo's warmth.
- **Body font** (`Inter`, 400/500/600): everything else — menu items, prices, forms, buttons.

Load via `next/font/google` with `display: 'swap'` and subset `latin`. Do not use a webfont for the logo itself — use the SVG/PNG.

### Scale

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display-lg` | 40/48 | 700 display | Welcome hero |
| `display-md` | 32/40 | 700 display | Page titles |
| `display-sm` | 24/32 | 600 display | Section headings |
| `body-lg` | 18/28 | 400 sans | Intro text |
| `body` | 16/24 | 400 sans | Default — never below this for body |
| `body-sm` | 14/20 | 400 sans | Secondary info |
| `caption` | 12/16 | 500 sans | Labels, timestamps |
| `price` | 18/24 | 600 sans, tabular-nums | All money |

**`font-variant-numeric: tabular-nums` on every price and quantity.** Proportional digits make a price column visibly ragged.

**16px minimum for form inputs on mobile** — iOS Safari zooms the viewport on focus for anything smaller, which feels broken.

---

## 3. Spacing, radius, elevation

4px base scale: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.

| Radius | Value | Use |
|---|---|---|
| `sm` | 8px | Chips, badges, inputs |
| `btn` | 12px | Buttons |
| `card` | 16px | Cards, sheets |
| `pill` | 999px | Toggles, quantity steppers, tags |

Three elevation levels only: `card` (resting), `card-hover`, `sticky` (fixed bottom bars). More levels than that and nothing reads as more important than anything else.

---

## 4. Components

### Button

| Variant | Fill | Text | Use |
|---|---|---|---|
| Primary | `primary-500` | white | Main action, one per screen |
| Primary hover | `primary-700` | white | |
| Secondary | transparent, `line-strong` border | `ink` | Cancel, Back |
| Ghost | transparent | `primary-600` | Tertiary links |
| Danger | `error` | white | Cancel order, deactivate user |
| Disabled | `line` | `ink-subtle` | `cursor-not-allowed`, `aria-disabled` |

Sizes: `sm` 36px · `md` 44px · `lg` 52px.
**44px minimum touch target** on anything tappable — Apple HIG and WCAG 2.5.5 both land there, and this app is used one-handed while walking.

Every button that triggers a request needs a **loading state**: spinner replaces the label, button stays the same width (prevents layout jump), `disabled` while pending.

### Input

```
Label (caption, ink-muted, 6px below)
┌──────────────────────────────────┐  44px tall, radius sm
│  placeholder / value             │  1px line border
└──────────────────────────────────┘  focus: 2px primary-500 ring
Helper or error text (body-sm)
```
Error state: `error` border + `error` message + `aria-invalid="true"` + `aria-describedby` pointing at the message. Color alone never conveys the error — there is always text.

### Menu item card

```
┌─────────────────────────────────────────┐
│ ┌──────┐  🟩 Paneer Tikka Roll          │
│ │ img  │  Grilled paneer, onion, mint    │
│ │ 88px │  ★ 4.5 (23)                     │
│ └──────┘  ₹120        [  Add  ] / [− 2 +]│
└─────────────────────────────────────────┘
```
- Veg/non-veg square marker **before** the name, always (FSSAI convention in India).
- Sold-out state: whole card at `opacity: 0.55`, image greyscale, button replaced by a `Sold out` pill. Card stays visible (HLD §7).
- The Add button swaps in place to a quantity stepper once the item is in the cart. Don't navigate away to change quantity.

### Order status stepper

Horizontal on desktop, vertical on mobile.
```
 ●━━━━━━●━━━━━━○──────○──────○
Placed Accepted Preparing Ready Delivered
```
Completed: `primary-500` filled. Current: `primary-500` ring with a subtle pulse. Upcoming: `line-strong` hollow.
**Never animate the pulse faster than 2s** and respect `prefers-reduced-motion`.

### Star rating

Input: 5 buttons, 44px each, `role="radiogroup"`, keyboard arrow support, filled `primary-500`.
Display: static stars + numeric value. Always include the number — stars alone are imprecise and unreadable to screen readers without a label like `aria-label="4.5 out of 5"`.

### Toggle (admin availability)

Pill switch, 52×32. On: `primary-500`. Off: `line-strong`.
**Optimistic update with rollback**: flip instantly, revert and show a toast if the request fails. Staff toggle these while serving customers and cannot wait on a round trip.

### Toast

Top-right desktop, top-center mobile. Auto-dismiss 4s, manual close. `role="status"` for success, `role="alert"` for errors.

### Empty states

Every list needs one: icon, one line of what's missing, one action. "No orders yet — Browse the menu →" beats a blank screen.

---

## 5. Layout

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | 375–767 | Single column, bottom nav, sticky cart bar |
| Tablet | 768–1023 | 2-col menu grid, top nav |
| Desktop | 1024+ | 3-col menu grid, sidebar cart, max-width 1200px |

**Mobile-first, and mean it.** Most orders come from a phone during a lunch break. Build 375px first, then widen.

- Page gutters: 16px mobile, 24px tablet, 32px desktop.
- Sticky bottom cart bar on mobile (`shadow-sticky`) showing item count and total, tappable to the cart.
- Bottom nav on mobile: Home · Menu · Orders · Profile. 56px tall plus safe-area inset.

```css
padding-bottom: calc(16px + env(safe-area-inset-bottom));
```
Without the safe-area inset, the iPhone home indicator overlaps your bottom bar.

---

## 6. Accessibility checklist

Verify before any page is called done:

- [ ] All text meets 4.5:1 (3:1 for 18px+ bold or 24px+)
- [ ] No `#CC5E0F` text at body size — use `primary-600`
- [ ] Every interactive element reachable by keyboard, visible focus ring (2px `primary-500`, 2px offset)
- [ ] Touch targets ≥ 44×44px
- [ ] Every image has `alt`; decorative ones `alt=""`
- [ ] Every form input has a `<label>` (not a placeholder standing in for one)
- [ ] Errors announced via `aria-live`
- [ ] Veg/non-veg conveyed by text or `aria-label`, never color alone
- [ ] Status conveyed by text, never color alone
- [ ] `prefers-reduced-motion` respected
- [ ] Page has one `<h1>`; heading levels don't skip
- [ ] Tested with keyboard only and with a screen reader on one full order flow

---

## 7. Voice and copy

The tagline — *"A roll that makes you feel whole"* — is warm and a little playful. UI copy should match without being cute at the wrong moment.

| Situation | Write | Don't write |
|---|---|---|
| Empty cart | "Your cart is empty. Let's fix that." | "No items found." |
| Order placed | "Order placed. We're on it." | "Order successfully created." |
| Sold out | "Sold out for today" | "Item unavailable" |
| Delivery off | "Kitchen's closed right now. Back at 5pm." | "Delivery disabled." |
| Slot full | "That slot just filled up. Pick another?" | "SLOT_FULL" |
| Error | "Something went wrong. Try again?" | "Error 500: Internal Server Error" |

**Payment and errors get plain language, not jokes.** Nobody wants whimsy when their order failed.

Currency: always `₹` with no space — `₹120`, `₹1,240` (Indian grouping: `₹1,20,000` for lakhs).

---

## 8. Assets

| Asset | Format | Use |
|---|---|---|
| Logo full | SVG + PNG @1x/@2x | Welcome, header, login |
| Logo mark | SVG, square | Favicon, app icon, small header |
| Wordmark | SVG, horizontal | Compact header |
| OG image | PNG 1200×630 | Link previews |
| Favicon | ICO + PNG 32/180/192/512 | Browser, PWA |

Menu images: **4:3 ratio, 800×600, WebP with JPEG fallback, under 100 KB.** Served via `next/image` with `sizes` set. A menu is images-heavy and a slow first load on campus wifi loses the order.

Always supply a placeholder image for items without a photo — a broken image icon on a food menu looks like the kitchen is broken too.
