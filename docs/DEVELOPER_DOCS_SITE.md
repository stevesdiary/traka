# TRAKA Developer Docs — Site Implementation Blueprint

Target UX: **https://paystack.com/docs** — a clean, searchable, developer-facing
documentation site with a persistent sidebar, code samples in multiple languages,
a full interactive API reference, and a webhooks section.

This file is the implementation spec for building that page **on the TRAKA
landing page** (a separate frontend from this API repo). It defines the
architecture, layout, navigation, page-by-page content, and design tokens.

Source of truth for the actual API behavior: `docs/PARTNER_INTEGRATION.md`
(human-written) and `swagger.yaml` (machine-readable OpenAPI).

---

## 1. Decisions to make up front

| Decision | Recommendation | Why |
| -------- | -------------- | --- |
| Where it lives | A `/docs` section of the existing landing page | Keeps one domain, one SEO footprint, one design system |
| Framework | Next.js (App Router) + MDX + Tailwind, or **Nextra** for the docs section | Content as MD/MDX files, static generation, dark mode, built-in sidebar/TOC/search |
| API reference rendering | Embed an OpenAPI renderer (**Redocly** or **Scalar** or Stoplight Elements) fed by `swagger.yaml` | Paystack's interactive reference; zero manual duplication — docs stay in sync with the API |
| Search | Client-side (FlexSearch / pagefind) or **Algolia DocSearch** | Instant full-text search across all pages |
| Versioning | Single `v1` initially; add version badge when `v2` exists | Avoids over-engineering now |

> Alternative: skip custom code entirely and publish on **Mintlify / GitBook /
> ReadMe** — you get the Paystack-style sidebar, search, code tabs, and try-it-out
> out of the box, then the markdown below maps 1:1 onto their content model. Choose
> this if the landing team has no bandwidth for a bespoke docs section.

---

## 2. Routing & information architecture

### 2.1 URL map

```
/                                              landing page (existing)
/docs                                          docs home / overview
/docs/getting-started
/docs/authentication
/docs/orders
/docs/orders/bulk
/docs/tracking
/docs/rides
/docs/webhooks
/docs/pricing-and-limits
/docs/errors
/docs/api-reference                       ← embedded OpenAPI (full interactive spec)
/docs/api-keys
/docs/changelog                          ← optional
```

### 2.2 Sidebar navigation (Paystack-style)

```
Docs
├─ Overview
├─ Getting started
│   ├─ Create an account & business
│   ├─ Get an API key
│   ├─ Your first order (quickstart)
│   └─ Environments & base URLs
├─ Guides
│   ├─ Authentication
│   ├─ Orders
│   │   ├─ Create an order
│   │   ├─ Bulk orders
│   │   ├─ Track an order
│   │   ├─ Update recipient
│   │   └─ Confirm delivery
│   ├─ On-demand rides
│   ├─ Pricing & package limits
│   ├─ API keys & key rotation
│   └─ Rate limits
├─ Webhooks
│   ├─ Overview & events
│   ├─ Payloads
│   ├─ Verify signatures
│   └─ Delivery & retries
├─ Errors
├─ API Reference            ← OpenAPI embed
└─ Changelog
```

---

## 3. Page layout & components

Mirror Paystack's layout: sticky top nav, fixed left sidebar, content column,
sticky right-hand "On this page" TOC.

```
┌──────────────────────────────────────────────────────────────┐
│ Top navbar: [TRAKA ▾] [Product] [Developers] [Pricing] [Docs ▾] [Sign in] │
├──────────┬───────────────────────────────────┬───────────────┤
│ Sidebar  │ Content                           │ On this page  │
│ (300px)  │  H1                               │ - Overview    │
│ ▸ Overview│  intro paragraph                 │ - Installation│
│ ▸ Getting │  code block [curl|Node|Python]   │ - Create order│
│   started │  request/response blocks         │ ...           │
│ ▸ Orders  │  info/warning callouts           │               │
│ ▸ Webhooks│  tables, accordions, links       │               │
└──────────┴───────────────────────────────────┴───────────────┘
```

### 3.1 Component inventory

| Component | Notes |
| --------- | ----- |
| **CodeBlock** | Syntax-highlighted; language tabs (`curl`, `Node.js`, `Python`); copy button |
| **RequestBlock / ResponseBlock** | HTTP method badge (GET/POST/PATCH/DELETE), colored status, collapsible headers, JSON body |
| **EndpointCard** | `POST /api/v1/external/orders` + short description + "Try it" link (→ API reference) |
| **Callout** | Variants: `info`, `warning`, `tip`, `error`. Rendered from `:::info` / `:::warning` MDX directives |
| **Table** | Styled tables for params, enums, error codes |
| **Accordion** | "View full schema", "Show all fields" |
| **TOC** | Right rail, scroll-spy from H2/H3 |
| **SearchBar** | Ctrl+K command palette + navbar search |
| **Breadcrumbs** | `Docs / Orders / Create an order` |
| **Prev/Next** | Bottom pager across docs pages |
| **Feedback** | "Was this page helpful?" (sends to analytics) |
| **TryItPanel** | Optional: live request builder against a sandbox base URL |

### 3.2 Design tokens (suggested — matches TRAKA brand)

| Token | Value |
| ----- | ----- |
| Accent | Indigo/blue (Paystack uses `#0a84ff`-family; use TRAKA brand color) |
| Background | `#ffffff` light, `#0b1020`-family dark |
| Text | Near-black `#1a1f36` / light-mode, `#e6e8f0` dark |
| Muted text | `#5c6382` |
| Code bg | `#f7f8fa` light, `#12182b` dark |
| Border | `#e5e8f0` |
| Font | System sans stack (Inter if bundled); mono `JetBrains Mono` / `SF Mono` for code |
| Radius | 8px cards, 4px inline |
| Max content width | 780px; gutter 32px; sidebar 300px; TOC 240px |

---

## 4. Page-by-page content blueprint

Each page below includes the actual content to put on it, grounded in the live API
(see `docs/PARTNER_INTEGRATION.md` for full field tables). Keep every page under
one "paragraph + one concept" rhythm; heavy tables live on reference pages, not
guides.

### 4.1 `/docs` — Overview

- One-liner: "TRAKA lets your business create, track, and confirm deliveries
  programmatically — and get notified in real time via webhooks."
- Three feature cards: **Create orders** (single & bulk), **Track in real time**,
  **Webhooks** (signed & retried).
- Quick links: Getting started, API reference, Webhooks.
- Callout: "The External API is tenant-scoped. An API key can only manage orders
  created by its own business."

### 4.2 `/docs/getting-started` — Getting started

Steps (each with code sample):

1. **Create a business** (via the app):
   ```http
   POST /api/businesses
   Authorization: Bearer {jwt}
   Content-Type: application/json

   { "business_name": "Acme Stores", "business_address": "12 Marina, Lagos",
     "contact_person": "Jane Doe", "phone": "+2348012345678" }
   ```
2. **Create an API key** (owner/admin only):
   ```http
   POST /api/businesses/{business_id}/api-keys
   Authorization: Bearer {jwt}
   Content-Type: application/json

   { "name": "Production checkout" }
   ```
   > ⚠️ The `raw_key` (`sk_live_...`) is shown **once**. Store it in a secret manager.
3. **Send your first order** — link to Quickstart (`/docs/getting-started#your-first-order`).
4. **Subscribe to webhooks** (optional) — link to `/docs/webhooks`.

Environments & base URLs:

| Environment | Base URL |
| ----------- | -------- |
| Production | `https://api.traka.com/api/v1/external` |
| Development | `http://localhost:4000/api/v1/external` |

### 4.3 `/docs/authentication` — Authentication

- Header-based auth: `X-API-Key: sk_live_...`
- All `/v1/external` requests require it.
- Rate limit: **100 requests / 60s per key**.
  - Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
  - On limit: `429` with `retry_after_seconds`.
- Error responses:
  - `401` missing key / `401` invalid or revoked key.
- Callout (warning): never expose `sk_live_` keys in browser or mobile code.

### 4.4 `/docs/orders` — Orders

- **Create order** `POST /api/v1/external/orders`
  - Required: `recipient_name`, `recipient_phone`, `pickup_address`, `delivery_address`, `description`.
  - Defaults: `package_size=SMALL`, `delivery_speed=STANDARD`, `payment_method=DIGITAL`, `payment_by=SENDER`, `category=General`.
  - Weight max 40kg (above → `503 coming_soon`).
  - Response `201`: `order { id, tracking_number, status, tracking_url, pricing_breakdown, dispatch }`.
- **Bulk orders** `POST /api/v1/external/orders/bulk`
  - Up to 50 items; `207 Multi-Status` with per-item `orders[]` and `errors[]`.
- **Track** `GET /api/v1/external/orders/{tracking_number}`
  - Returns full state incl. `live_tracking`, `eta_minutes`, `live_tracking_url`.
- **Update recipient** `PATCH /api/v1/external/orders/{tracking_number}/recipient`
  - Only `PENDING`; changing `delivery_address` re-quotes and returns new `pricing_breakdown`.
- **Confirm delivery** `POST /api/v1/external/orders/{tracking_number}/confirm`
  - Idempotent; `422` if cancelled.

Each sub-page gets the request table, a curl/Node/Python example, and a response
example from `docs/PARTNER_INTEGRATION.md` §6.

### 4.5 `/docs/rides` — On-demand rides

- `POST /api/v1/external/rides`
- Same fields as orders; `delivery_speed` forced to `SAME_DAY`, category `On-demand`, payment defaults `CASH`/`SENDER`.
- Track/confirm via the returned `tracking_number`.

### 4.6 `/docs/webhooks` — Webhooks

- Overview: "TRAKA POSTs events to your URL so you don't have to poll."
- Manage via dashboard API:
  - `POST`/`GET` `/api/businesses/{business_id}/webhooks`, `DELETE .../{webhook_id}`,
    `GET .../{webhook_id}/deliveries` (attempt log).
- Events table:

| Event | Fires when |
| ----- | ---------- |
| `order.created` | Order or ride created |
| `order.status_changed` | Status changes (e.g. `IN_TRANSIT`) |
| `order.delivered` | Delivered via rider flow |
| `order.confirmed` | Confirmed via External API |
| `rider.assigned` | Rider auto-assigned |
| `*` | Wildcard (all) |

- Delivery format (headers + body):
  ```
  POST https://app.acme.com/traka-webhook
  Content-Type: application/json
  X-Traka-Signature: sha256=...
  X-Traka-Event: order.created
  X-Traka-Delivery-Id: ...
  X-Traka-Timestamp: 1754334000

  { "event": "order.created", "data": { ... }, "delivery_id": "...", "timestamp": 1754334000 }
  ```
- **Verify signatures** page: HMAC-SHA256 over the raw body with `whsec_...`
  secret; include Node.js and Python verification snippets (copy from
  `docs/PARTNER_INTEGRATION.md` §10.4). Add a `:::warning` to use **raw bytes**.
- **Delivery & retries**:
  - 10s timeout; retries 5× with exponential backoff (~30s, 1m, 2m, 4m, 8m).
  - Retry on `5xx`/network; terminal on `4xx`; auto-**disable** subscription on
    exhaustion or `4xx`.
  - Dedupe on `delivery_id`.
  - Inspect attempts via the `deliveries` endpoint (`status`, `attempt_count`,
    `last_status_code`, `last_error`).

### 4.7 `/docs/pricing-and-limits` — Pricing & limits

- Max weight **40kg**; above = coming soon (`503`, not a validation error).
- Weight defaults if `package_weight` omitted: SMALL 1kg, MEDIUM 5kg, LARGE 12kg.
- Formula + component table (from `docs/PARTNER_INTEGRATION.md` §9):

```
subtotal = (base ₦500 + ₦100/km + speed fee + fuel adj) × weight_multiplier
platform_fee = subtotal × 0.15   (businesses)
total = subtotal + platform_fee
```

| Component | Value |
| --------- | ----- |
| base_fee | ₦500 |
| distance_fee | ₦100/km |
| speed_fee | STANDARD ₦0, EXPRESS ₦300, SAME_DAY ₦150 |
| weight_multiplier | ≤5kg ×1.0, ≤15kg ×1.25, ≤40kg ×1.5 |
| platform_fee | 15% (configurable) |

- `pricing_breakdown` JSON example.
- Payments: `DIGITAL` → paid immediately; `CASH`/`BANK_TRANSFER` → pending.

### 4.8 `/docs/errors` — Errors

- Error shape: `{ "error": "message" }` plus optional `required`, `fields`,
  `coming_soon`, `retry_after_seconds`, `details` (dev only).
- Status-code table: 200, 201, 207, 400, 401, 403, 404, 422, 429, 500, 503.
- Client checklist: retry 429 with backoff; treat `503 coming_soon` as not-yet-
  available; inspect 207 per-item.

### 4.9 `/docs/api-reference` — API Reference (embedded)

- Embed `swagger.yaml` via **Redocly / Scalar / Stoplight Elements**.
- Include all tags (External, API Keys, Webhooks) — the security scheme
  (`ApiKeyAuth`) and endpoints are already defined in the OpenAPI file.
- "Try it" points at the development base URL so docs visitors can test.

### 4.10 `/docs/api-keys` — API keys

- Lifecycle: create (`raw_key` once) → use → rotate → revoke.
- `GET /api/businesses/{business_id}/api-keys` shows `key_prefix`, `status`,
  `last_used_at`, `expires_at` — never the full key.
- Rotation steps (create new → deploy → revoke old).
- Roles: only owner/admin (`403` for `MEMBER`).

---

## 5. Code sample library

Centralize examples in one file per language and `import` them into MDX, so
samples stay consistent:

```
content/docs/_examples/
├── create-order.curl
├── create-order.node.ts
├── create-order.python.py
├── webhook-verify.node.ts
├── webhook-verify.python.py
└── ... one set per endpoint
```

Every guide page renders these via the `CodeBlock` component with language tabs.
Keep the snippets byte-for-byte aligned with `docs/PARTNER_INTEGRATION.md`.

---

## 6. Search, SEO, metadata

- **Search**: index titles + headings + first 200 chars per page (FlexSearch) or
  DocSearch. Open from navbar and `Ctrl+K`.
- **Metadata per page**: `title`, `description`, `canonical`, `og:image`.
  - `/docs/*` gets `robots: index`.
  - Default description: "Create, track, and confirm TRAKA deliveries with our
    API keys, signed webhooks, and interactive API reference."
- **Sitemap**: include `/docs/*` in the site sitemap; wire to Google Search Console.
- **Version badge** in sidebar when v2 ships; `?v=v1` deep links are out of scope
  for now.

---

## 7. Keeping docs in sync (source of truth)

| Source | Used for | Update trigger |
| ------ | -------- | -------------- |
| `swagger.yaml` | API reference embed + endpoint/param tables | Every API change |
| `docs/PARTNER_INTEGRATION.md` | Guide text, examples, webhook & pricing content | Every behavior change |
| `.env.example` | Environment variable reference | Every env change |

Process: any API change ships with (a) OpenAPI update and (b) guide update; a CI
check fails if `swagger.yaml` is modified without a corresponding docs diff (a
`docs/sync` GitHub Action or a PR checklist).

---

## 8. Implementation checklist

**Phase 0 — Content inventory (1–2d)**
- [ ] Adopt this blueprint + map each page to existing content in
      `docs/PARTNER_INTEGRATION.md` and `swagger.yaml`.
- [ ] Decide: custom Next.js/MDX vs Mintlify/GitBook/ReadMe.

**Phase 1 — Scaffold (2–3d)**
- [ ] Create `/docs` section on the landing page (Nextra or custom MDX).
- [ ] Wire sidebar nav, routing, dark mode, layout shell, right-rail TOC.

**Phase 2 — Components (2–3d)**
- [ ] `CodeBlock` with language tabs + copy; `RequestBlock`/`ResponseBlock`;
      `Callout`; `Table`; `Accordion`; breadcrumbs; prev/next.

**Phase 3 — Content (3–5d)**
- [ ] Port pages 4.1–4.8 and 4.10 from `docs/PARTNER_INTEGRATION.md`.
- [ ] Extract shared code samples into `_examples/`.
- [ ] Embed OpenAPI renderer on `/docs/api-reference`.

**Phase 4 — Search, SEO, QA (1–2d)**
- [ ] Full-text search + `Ctrl+K`.
- [ ] Metadata, sitemap, OG images, robots.
- [ ] Responsive pass (sidebar drawers on mobile), 404 page for docs routes,
      "Was this page helpful?" feedback.
- [ ] Validate every endpoint in docs against the dev API.

**Phase 5 — Launch**
- [ ] Point nav link to `/docs` on landing page; submit sitemap; announce in
      changelog.
