# Ember CRM — Design System & Style Guide

A complete style reference for recreating the **Ember CRM** aesthetic: a warm, dense, professional sales workspace built around a golden-orange accent. Hand this document to another agent and they should be able to build screens that feel like they belong in the same product.

---

## 1. Design Principles

1. **Warm-neutral over cool-neutral.** Backgrounds carry a faint warm tint (hue ~70°) rather than the typical blue-gray. This makes the golden accent feel native, not pasted on.
2. **Dense but breathable.** Sales people live in this UI all day — show a lot of data, but give every row enough vertical room (44–48px) to scan.
3. **Monospace for numerals.** Money, percentages, dates, counts, IDs — anything numeric goes in Geist Mono. It aligns into columns and signals "data" without extra chrome.
4. **One accent, used surgically.** Golden orange is for *active state* (selected nav, primary CTA, focused stage, progress fills). Never use it for body text or large backgrounds.
5. **Status by hue, not by saturation.** Each status (Customer, Qualified, Negotiation, etc.) gets its own muted hue at the same lightness/chroma envelope — a quiet rainbow, not traffic lights.
6. **Borders, not shadows.** Cards and surfaces are separated by 1px hairlines (`--border`). Shadows appear only on lift (hovered kanban card, open drawer).
7. **No decoration for its own sake.** No gradients on cards, no emoji, no illustration. The only gradient is the brand logomark (golden → deep orange).

---

## 2. Color System

All colors are expressed in **OKLCH** for perceptual uniformity and easy theming. Three planes: **neutrals** (surface chrome), **accent** (golden orange), **statuses** (per-state hues).

### 2.1 Neutrals (Light mode)

| Token | Value | Use |
|---|---|---|
| `--bg` | `oklch(0.985 0.005 70)` | App background — warm near-white |
| `--surface` | `oklch(1.0 0 0)` | Cards, tables, drawer body — pure white |
| `--surface-2` | `oklch(0.965 0.008 70)` | Hover state, table headers, subtle wells |
| `--border` | `oklch(0.92 0.008 70)` | 1px hairlines between everything |
| `--ink` | `oklch(0.22 0.012 60)` | Primary text, headlines, strong numbers |
| `--ink-2` | `oklch(0.42 0.012 60)` | Secondary text, body copy, table cell text |
| `--ink-3` | `oklch(0.58 0.010 60)` | Tertiary — labels, metadata, timestamps |

### 2.2 Neutrals (Dark mode)

| Token | Value |
|---|---|
| `--bg` | `oklch(0.18 0.012 60)` |
| `--surface` | `oklch(0.22 0.012 60)` |
| `--surface-2` | `oklch(0.26 0.012 60)` |
| `--border` | `oklch(0.32 0.012 60)` |
| `--ink` | `oklch(0.96 0.01 60)` |
| `--ink-2` | `oklch(0.80 0.01 60)` |
| `--ink-3` | `oklch(0.60 0.01 60)` |

### 2.3 Accent — Golden Orange

| Token | Value | Use |
|---|---|---|
| `--accent` | `oklch(0.72 0.155 62)` | Primary action — CTAs, active progress, focused stage column |
| `--accent-deep` | `oklch(0.50 0.175 50)` | Hover/pressed of accent, text on tint backgrounds, brand wordmark |
| `--accent-soft` | `oklch(0.86 0.10 62)` | Soft fills — secondary progress segments, decorative |
| `--accent-tint` | `oklch(0.96 0.05 62)` | Selected-nav background, hover wash, badge fills |
| `--accent-ink` | `oklch(0.20 0.05 50)` | Text color when placed on top of `--accent` |

**Accent presets** (theme alternatives — all preserve the same lightness/chroma envelope):

- Golden orange — hue **62**, chroma **0.155** *(default)*
- Amber — hue **40**, chroma **0.16**
- Honey — hue **85**, chroma **0.15**
- Terracotta — hue **25**, chroma **0.16**
- Cobalt — hue **210**, chroma **0.15**
- Sage — hue **150**, chroma **0.12**

### 2.4 Status Hues

Each pipeline stage / contact status maps to one hue. **Format:** `bg: oklch(~0.94 0.05 H), fg: oklch(~0.40 0.13 H)`.

| Status | Hue | Background | Foreground |
|---|---|---|---|
| Lead | 80 (neutral) | `oklch(0.95 0.01 80)` | `oklch(0.45 0.02 80)` |
| Qualified | 220 (blue) | `oklch(0.94 0.05 220)` | `oklch(0.40 0.13 220)` |
| Proposal | 30 (warm) | `oklch(0.94 0.05 30)` | `oklch(0.42 0.13 30)` |
| Negotiation | 60 (accent) | `oklch(0.94 0.07 60)` | `oklch(0.42 0.14 55)` |
| Closed Won / Customer | 150 (sage) | `oklch(0.95 0.06 150)` | `oklch(0.38 0.14 150)` |
| At Risk / Lost | 25 (red) | — | `oklch(0.50 0.18 25)` |

---

## 3. Typography

### 3.1 Type Stack
- **UI / Headlines / Body:** `'Geist', -apple-system, system-ui, sans-serif`
- **Numbers / Data / Code / Timestamps:** `'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace`

Load from Google Fonts: `Geist:wght@400;500;600;700` and `Geist+Mono:wght@400;500;600`.

Enable opentype features: `font-feature-settings: 'cv11', 'ss01';` and `-webkit-font-smoothing: antialiased;`.

### 3.2 Scale

| Role | Size | Weight | Tracking | Color |
|---|---|---|---|---|
| Page title (H1) | 22–26px | 600 | -0.02em | `--ink` |
| Section title (Card H3) | 13px | 600 | -0.01em | `--ink` |
| KPI value | 24–28px | 600 mono | -0.02em | `--ink` |
| Body | 14px | 400 | 0 | `--ink-2` |
| Table cell | 13px | 400 | 0 | `--ink-2` |
| Table cell (numeric, strong) | 13px | 600 mono | 0 | `--ink` |
| Label / uppercase eyebrow | 11–11.5px | 600 | 0.04em (UPPERCASE) | `--ink-3` |
| Caption / timestamp | 11–12px | 400 | 0 | `--ink-3` |
| Status badge | 11px | 600 | 0.01em | per-status fg |
| Button | 13px | 500 | 0 | per-variant |

### 3.3 Rules
- Body line-height: **1.5**. Headlines tighten to **1.3**.
- Use `text-wrap: pretty` on prose.
- Eyebrows / column headers are always **UPPERCASE + 0.04em tracking + 600 weight**.
- Numbers always in mono. Never let a price, percentage, or date render in the proportional UI font.

---

## 4. Spacing & Layout

### 4.1 Scale
4 — 6 — 8 — 10 — 12 — 14 — 16 — 18 — 20 — 24 — 28 — 32

Use this scale exclusively; do not invent in-between values.

### 4.2 Layout

- **App shell:** flex row, full viewport height, no body scroll. Sidebar (fixed 232px) + main column.
- **Sidebar:** `padding: 16px 12px;` `gap: 18px;` between sections.
- **Top bar:** `padding: 12px 24px;` 1px bottom border.
- **Main content:** `padding: 24px 28px 60px;` scrolls independently.
- **Card grids:** 16px gap. Common ratios: `1fr 1fr 1fr 1fr` (KPI row), `1.6fr 1fr` (chart + side widget).

### 4.3 Component spacing

- **Card padding:** 20px default. 0 for tables — let `<th>/<td>` padding define the rhythm.
- **Card header:** `padding: 14px 20px;` 1px bottom border separating header from body.
- **Table cell:** `padding: 12px 16px;` (12 top/bottom, 16 sides). Header cells: `10px 16px`.
- **Button:** `padding: 7px 12px;` `gap: 6px;` between icon and label.
- **Icon button (square):** 32×32px, 8px radius.
- **Form input:** `padding: 7px 12px;` 8px radius.

---

## 5. Shape & Surface

### 5.1 Border Radius

| Element | Radius |
|---|---|
| Card | 12px |
| Drawer / large panel | 12px |
| Button | 8px |
| Input / search field | 8px |
| Nav item | 7px |
| Avatar | 50% (full circle) |
| Company logomark | 6px |
| Status badge / pill | 999px (full pill) |
| Progress bar | 999px |
| Brand mark / square icon tile | 8px |
| Small color chip / legend swatch | 2px |

### 5.2 Borders
- **Everywhere:** `1px solid var(--border)`. Cards, tables, inputs, drawer, sidebar separator — all the same hairline.
- **Active selection:** swap to `1px solid var(--accent)` instead of adding extra weight.

### 5.3 Shadows
Shadows are rare. Reserved for **lift on interaction**:

- Card hover (kanban deal card): `box-shadow: 0 2px 8px rgba(80, 40, 0, 0.06); transform: translateY(-1px);`
- Drawer / modal: `box-shadow: -20px 0 40px rgba(60, 30, 0, 0.10);` (note warm tint, not neutral black)
- Primary button inner highlight: `box-shadow: 0 1px 0 rgba(120, 60, 0, 0.18) inset, 0 1px 1px rgba(120, 60, 0, 0.08);`
- Avatar ring (in stack): `box-shadow: 0 0 0 2px var(--bg);`

Never use generic `rgba(0,0,0,0.1)` — always warm-tinted browns.

---

## 6. Components

### 6.1 Button

Three variants — icon optional on the left, gap 6px.

```
primary:    bg=--accent, color=--accent-ink, warm-brown inset highlight
secondary:  bg=--surface, color=--ink, border=--border
ghost:      bg=transparent → --surface-2 on hover/active, color=--ink-2
```

Sizing: `padding: 7px 12px; border-radius: 8px; font-size: 13px; font-weight: 500;` for all.

### 6.2 Card

Standard surface wrapper. Optional header strip with title (13px/600) on the left and an action (button or kebab) on the right, separated by a 1px border from the body.

```
background: --surface; border: 1px solid --border; border-radius: 12px;
header: padding 14px 20px, border-bottom 1px --border
body:   padding 20px (or 0 for tables)
```

### 6.3 Status Badge

```
display: inline-flex; align-items: center; gap: 6px;
padding: 2px 8px; border-radius: 999px;
font-size: 11px; font-weight: 600;
background + foreground from the status hue table
prefixed by a 5px solid-color dot in the foreground color
```

### 6.4 Avatar

Circular, initials-based, background derived from a per-user hue:
```
background: oklch(0.88 0.08 H);
color:      oklch(0.32 0.08 H);
font-weight: 600; font-size: ~40% of avatar size;
```

**Avatar stack:** overlap with `margin-left: -8px;` and a 2px `--bg` ring (via `box-shadow`). Overflow chip `+N` uses `--surface-2` background.

### 6.5 Company Logomark

Flat colored tile with 2-letter initials. **Not** a circle — a 6px-radius rectangle to distinguish from people:
```
background: oklch(0.94 0.03 H);
color:      oklch(0.38 0.06 H);
border: 1px solid --border;
font-weight: 700; letter-spacing: 0.04em;
```
Hue is deterministic per company name.

### 6.6 Table

```
width: 100%; border-collapse: collapse;
thead: background --surface-2
tr borders: 1px solid --border (between rows only, none above first)
hover row: background --surface-2; cursor: pointer
```

Column header cells: 11px / 600 / UPPERCASE / 0.04em tracking / `--ink-3`. Sortable headers add an up/down arrow at 10px when active and switch color to `--ink`.

### 6.7 KPI Card

```
padding: 18px; (no header strip)
label:  11.5px UPPERCASE 600 --ink-3
value:  24px mono 600 -0.02em --ink
delta:  11.5px 600, green (oklch(0.48 0.14 150)) up, red (oklch(0.52 0.18 25)) down
sub:    11.5px --ink-3
```

### 6.8 Kanban Column

```
background: --surface-2; border: 1px --border; radius: 12px;
header: 12px 14px, with stage-color 8px square + label + count (mono) + total value (right, mono)
body: padding 10px, gap 8px, cards stacked vertically
on drag-over: bg → --accent-tint, border → --accent
```

### 6.9 Deal Card (Kanban)

```
bg: --surface; border: 1px --border; radius: 10px; padding: 12px;
draggable; on hover lift 1px with warm-brown shadow
[CompanyMark 24px] + 2-line title (clamp)
value (16px mono 600) — right side: "65% · 22d" in mono 10.5px
3px-tall probability bar fill = stage color
footer: close date (mono, left) — owner avatar 20px (right)
```

### 6.10 Drawer (right side panel)

```
position: fixed; right: 0; width: 480px; full height;
background: --bg; border-left: 1px --border;
backdrop: rgba(30, 18, 6, 0.36) blur(2px)
animation: slideIn 180ms ease-out (translateX 20→0, opacity)
inner sections separated by 24px gap
header: 20px 24px, 1px bottom border, company eyebrow + deal title + close icon
```

### 6.11 Progress Bar

```
height: 4–6px; background: --surface-2; border-radius: 999px;
fill: --accent (or stage color for per-deal probability)
stacked variant: two fills, with --accent-soft as the lighter "open" portion behind --accent "closed"
```

### 6.12 Nav Item

```
padding: 7px 10px; gap: 10px; border-radius: 7px;
inactive: bg transparent, color --ink-2, hover --surface-2
active:   bg --accent-tint, color --accent-deep, font-weight 600
icon 15px, optional badge pill on the right (mono, 10px, --surface-2 bg)
```

### 6.13 Brand Mark

A 30×30px tile, `border-radius: 8px`, gradient `linear-gradient(135deg, --accent 0%, --accent-deep 100%)`, with a white iconographic SVG inside (e.g. abstract "E" peak with a dot). Subtle highlight inset: `0 1px 0 rgba(255, 220, 180, 0.4) inset`.

---

## 7. Iconography

- **Style:** Outline / stroked, **never filled**.
- **Stroke width:** 1.6 default, 2.4 for small arrows in deltas.
- **Size:** 14–16px in UI, 13px inline, 26px for empty-state hero icons.
- **Color:** `currentColor` — inherits from parent text color.
- **Shape:** `stroke-linecap: round; stroke-linejoin: round;` 24×24 viewBox.
- Hand-draw all icons inline (no icon library). Keeps the set cohesive and the bundle tiny.

---

## 8. Data Visualization

### 8.1 Area Chart (trend)
- Single accent-color stroke, 1.4px, `vector-effect: non-scaling-stroke`.
- Gradient fill below: accent at 0.28 opacity → 0 opacity (top → bottom).
- Last point dot (1.6px) only; no other dots.
- X-axis labels in mono 11px below the chart, equally spaced.
- Reserve top 15% headroom (don't draw to full height).

### 8.2 Donut
- 14px stroke thickness on a circle.
- Track ring: `--surface-2`. Segments use stage colors.
- Rotate -90° so first segment starts at 12 o'clock.

### 8.3 Quota / Progress Bars (stacked)
- 6px tall, 999px radius.
- Two fills: `--accent` (closed/achieved) over `--accent-soft` (open/pipeline) over `--surface-2` (remainder to quota).
- Percentage to the right of the row in mono 11.5px.

---

## 9. Activity / Timeline Pattern

Each activity row:
```
display: flex; gap: 12px; padding: 14px 20px;
border-bottom: 1px --border (except last)

[28px rounded-8px tinted square w/ 14px icon] — color per activity type:
  call    → blue   (oklch 0.92 0.05 220 / 0.42 0.13 220)
  email   → orange (oklch 0.94 0.05 30  / 0.45 0.13 30)
  meeting → purple (oklch 0.93 0.05 280 / 0.42 0.13 280)
  note    → warm gray
  task    → teal
  won     → sage green

right column:
  top row: "Maya · Eleanor Bishop"  ............... "14m ago" (mono)
  body: 12.5px --ink-2, lh 1.5
```

---

## 10. Motion

- **Hover transitions:** `transition: all 0.12s ease;` on background and transform.
- **Card lift:** `transform: translateY(-1px)` + soft shadow.
- **Drawer entrance:** 180ms slide-in from right with opacity fade.
- **Drag-over state on kanban column:** instant bg + border change (no transition delay) so the drop target is obvious.
- No bouncy easing. Linear or `ease`. This is a workspace, not a marketing site.

---

## 11. Content & Tone

- **Headlines:** sentence case. *"Highest-value deals to close"* not *"Highest-Value Deals To Close"*.
- **Eyebrows / labels:** UPPERCASE, terse. *"OPEN PIPELINE"*, *"WEIGHTED FORECAST"*.
- **Empty states:** plain prose, never "Oops!". *"No contacts match your filters."*
- **Numbers:** compact at scale (`$2.84M`, `$184k`) inside tight contexts (cards, kanban); full precision (`$184,000`) in tables and detail views.
- **Dates:** abbreviated month + day (`Jun 14`), always in mono.
- **Relative time:** `14m ago`, `2h ago`, `Yesterday`, `Last week` — never raw timestamps in feeds.
- **Avoid:** emoji, "" stylized punctuation, excessive exclamation, marketing adjectives. The CRM is a tool, not a personality.

---

## 12. Anti-Patterns

Things that would break this aesthetic:

- ❌ Cool-blue neutrals (`slate-100`, `gray-50`). Use the warm `oklch ~70 hue` neutrals.
- ❌ Background gradients on cards or full sections. The only gradient lives in the 30px brand mark.
- ❌ Drop shadows on every card. Use borders.
- ❌ Filled icons or duotone glyphs. Outline only.
- ❌ Color-coded "red/yellow/green" health indicators. Use the muted status hue system.
- ❌ Proportional-font numbers in tables. Always mono.
- ❌ Inter, Roboto, or system-ui as the headline face. Use Geist.
- ❌ Emoji as iconography.
- ❌ Rounded-corner left-border accent boxes (the "AI slop callout" pattern).
- ❌ Pure black on white. Text is always tinted (`--ink` at L=0.22, not 0).

---

## 13. Quick-Start Checklist

When applying this system to a new screen:

1. Drop in CSS variables (Section 2) and load Geist + Geist Mono.
2. Wrap everything in `--bg`. Use `--surface` cards on top.
3. Page header: H1 (22–26px, weight 600, -0.02em) + 13px `--ink-3` subtitle + right-aligned action buttons.
4. Tables get a `--surface-2` header row with UPPERCASE column labels; numeric columns in mono.
5. Any status/stage label → status badge. Any person → avatar. Any company → company mark.
6. Use `--accent` exactly once or twice per screen — for the primary CTA and for the currently active/selected element. Nothing else.
7. Spacing comes from the 4/8 scale only.
8. If you reach for a shadow, ask: would a border do? Usually yes.

---

*This system is intentionally narrow. Stay inside it and screens will feel consistent without anyone having to coordinate.*
