# TRAKA Partner Integration Guide

Integrate delivery, pickup, and on-demand courier rides into your website or
application. This guide covers the TRAKA **External API** — the surface built
for third-party businesses that want to create and track orders programmatically.

- **Base URL (production):** `https://api.traka.com/api/v1/external`
- **Base URL (development):** `http://localhost:4000/api/v1/external`
- **Authentication:** API key (`X-API-Key` header)
- **Interactive docs:** `http://localhost:4000/api-docs` (development)

> The External API is scoped to the calling business (tenant). An API key can
> only read and manage orders created by its own business. It cannot see or
> mutate orders belonging to other tenants.

---

## 1. Table of contents

1. [Overview](#2-overview)
2. [Getting started](#3-getting-started)
3. [Authentication & rate limits](#4-authentication--rate-limits)
4. [Making your first request](#5-making-your-first-request)
5. [Orders API](#6-orders-api)
6. [Rides API](#7-rides-api)
7. [Order statuses & lifecycle](#8-order-statuses--lifecycle)
8. [Pricing & package limits](#9-pricing--package-limits)
9. [Webhooks](#10-webhooks)
10. [Error handling](#11-error-handling)
11. [API key & webhook management (dashboard)](#12-api-key--webhook-management-dashboard)
12. [Best practices](#13-best-practices)
13. [Appendix: field reference](#14-appendix-field-reference)

---

## 2. Overview

The External API lets businesses:

- Create **delivery orders** (one at a time or in bulk up to 50).
- Book **on-demand courier rides** (`SAME_DAY` speed).
- **Track** orders by tracking number.
- Update recipient details or confirm delivery.
- Receive **webhooks** when order state changes.

The management endpoints (creating API keys and webhook subscriptions) use your
TRAKA dashboard credentials (Bearer JWT) and require a business **owner** or
**admin** role. Everything under `/v1/external` uses API keys instead.

---

## 3. Getting started

### 3.1 Prerequisites

1. A TRAKA business account with an **ACTIVE** tenant.
2. A business member with the **OWNER** or **ADMIN** role to create API keys.
3. An API key. Only one raw key value is ever shown — store it immediately.

### 3.2 Quick-start flow

1. **Create a business** (dashboard / web app) if you don't have one:
   ```http
   POST /api/businesses
   Authorization: Bearer {jwt}
   Content-Type: application/json

   {
     "business_name": "Acme Stores",
     "business_address": "12 Marina, Lagos",
     "contact_person": "Jane Doe",
     "phone": "+2348012345678"
   }
   ```
   Response: `201 Created` with the `business` object and `membership_role: "OWNER"`.
   The business id (`business.id`) is your `tenant_id` for the next steps.

2. **Create an API key**:
   ```http
   POST /api/businesses/{business_id}/api-keys
   Authorization: Bearer {jwt}
   Content-Type: application/json

   { "name": "Production checkout" }
   ```
   Response: `201 Created`:
   ```json
   {
     "message": "API key created. Store the raw_key securely — it will not be shown again.",
     "api_key": {
       "id": "uuid",
       "tenant_id": "uuid",
       "name": "Production checkout",
       "key_prefix": "sk_live_ABC1",
       "status": "ACTIVE",
       "created_by": "uuid",
       "created_at": "2026-08-04T12:00:00.000Z",
       "updated_at": "2026-08-04T12:00:00.000Z",
       "raw_key": "sk_live_<48+ characters>"
     }
   }
   ```
   The `raw_key` value is **only returned once**. Treat it like a password.

3. **Send your first order** — see [Making your first request](#5-making-your-first-request).

4. **(Optional) Subscribe to webhooks** — see [Webhooks](#10-webhooks).

---

## 4. Authentication & rate limits

### 4.1 API key auth

Every `/v1/external` request must include the key in the `X-API-Key` header:

```
X-API-Key: sk_live_...
```

| Header | Description |
| ------ | ----------- |
| `X-API-Key` | Your live API key (`sk_live_...`). Required on all external requests. |

Errors:

- `401` — `{ "error": "API key required. Provide it via the X-API-Key header." }` (missing key)
- `401` — `{ "error": "Invalid or revoked API key." }` (unknown, revoked, or expired key)

### 4.2 Rate limits

Each API key is limited to **100 requests per 60 seconds**.

- `429 Too Many Requests` when exceeded:
  ```json
  {
    "error": "Rate limit exceeded. Maximum 100 requests per 60 seconds per API key.",
    "retry_after_seconds": 45
  }
  ```
- Every response includes rate-limit headers:
  - `X-RateLimit-Limit` — requests allowed per window (`100`)
  - `X-RateLimit-Remaining` — requests left in the current window
  - `X-RateLimit-Reset` — seconds until the window resets

> Design your integration to retry `429`s with backoff. The `retry_after_seconds`
> field and `X-RateLimit-Reset` header tell you when to retry.

---

## 5. Making your first request

### Create a delivery order

**Request**

```http
POST /api/v1/external/orders
X-API-Key: sk_live_...
Content-Type: application/json

{
  "recipient_name": "John Doe",
  "recipient_phone": "+2348123456789",
  "recipient_email": "john@example.com",
  "pickup_address": "12 Marina, Lagos",
  "delivery_address": "44 Ajose Adeogun, Victoria Island, Lagos",
  "description": "Nike Air Force 1 - White",
  "delivery_notes": "Call before delivery",
  "package_size": "SMALL",
  "package_weight": 2,
  "delivery_speed": "EXPRESS",
  "category": "SHOES",
  "is_fragile": false,
  "payment_method": "DIGITAL",
  "payment_by": "SENDER"
}
```

**Response `201 Created`**

```json
{
  "message": "Order created successfully",
  "order": {
    "id": "uuid",
    "tracking_number": "TRK-X7K2",
    "status": "PENDING",
    "tracking_url": "https://app.traka.com/track/TRK-X7K2",
    "pricing_breakdown": {
      "base_fee": 500,
      "distance_fee": 1200,
      "speed_fee": 300,
      "weight_multiplier": 1,
      "platform_fee": 375,
      "total_amount": 2875
    },
    "dispatch": {
      "assigned": true,
      "attempts": 3,
      "message": "Rider assigned",
      "rider_id": "uuid",
      "eta_seconds": 1800
    }
  }
}
```

**cURL**

```bash
curl -X POST "https://api.traka.com/api/v1/external/orders" \
  -H "X-API-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_name": "John Doe",
    "recipient_phone": "+2348123456789",
    "pickup_address": "12 Marina, Lagos",
    "delivery_address": "44 Ajose Adeogun, Victoria Island, Lagos",
    "description": "Nike Air Force 1 - White",
    "package_size": "SMALL",
    "delivery_speed": "EXPRESS"
  }'
```

**Node.js**

```js
const res = await fetch("https://api.traka.com/api/v1/external/orders", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.TRAKA_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    recipient_name: "John Doe",
    recipient_phone: "+2348123456789",
    pickup_address: "12 Marina, Lagos",
    delivery_address: "44 Ajose Adeogun, Victoria Island, Lagos",
    description: "Nike Air Force 1 - White",
    package_size: "SMALL",
    delivery_speed: "EXPRESS",
  }),
});

const data = await res.json();
console.log(data.order.tracking_number);
```

**Python**

```python
import requests

res = requests.post(
    "https://api.traka.com/api/v1/external/orders",
    headers={"X-API-Key": "sk_live_...", "Content-Type": "application/json"},
    json={
        "recipient_name": "John Doe",
        "recipient_phone": "+2348123456789",
        "pickup_address": "12 Marina, Lagos",
        "delivery_address": "44 Ajose Adeogun, Victoria Island, Lagos",
        "description": "Nike Air Force 1 - White",
        "package_size": "SMALL",
        "delivery_speed": "EXPRESS",
    },
)
data = res.json()
print(data["order"]["tracking_number"])
```

---

## 6. Orders API

### 6.1 Create an order

`POST /api/v1/external/orders`

See [Section 5](#5-making-your-first-request) for a full example.

**Request body**

| Field | Type | Required | Default | Notes |
| ----- | ---- | -------- | ------- | ----- |
| `recipient_name` | string | **yes** | — | Recipient full name |
| `recipient_phone` | string | **yes** | — | Recipient phone number |
| `recipient_email` | string | no | — | For delivery notifications & PIN email |
| `pickup_address` | string | **yes** | — | Pickup location |
| `delivery_address` | string | **yes** | — | Delivery location |
| `description` | string | **yes** | — | What is being delivered |
| `delivery_notes` | string | no | — | Instructions for the rider |
| `package_size` | string | no | `SMALL` | `SMALL`, `MEDIUM`, or `LARGE` |
| `package_weight` | number | no | size default | Actual weight in kg (max `40`) |
| `delivery_speed` | string | no | `STANDARD` | `STANDARD`, `EXPRESS`, `SAME_DAY` |
| `category` | string | no | `General` | Order category |
| `is_fragile` | boolean | no | `false` | Marks package as fragile |
| `payment_method` | string | no | `DIGITAL` | `DIGITAL`, `CASH`, `BANK_TRANSFER` |
| `payment_by` | string | no | `SENDER` | `SENDER` or `RECIPIENT` |

**Response `201 Created`**

| Field | Description |
| ----- | ----------- |
| `message` | Human-readable confirmation |
| `order.id` | Order UUID |
| `order.tracking_number` | Tracking number (`TRK-XXXX`) |
| `order.status` | Initial status (`PENDING`) |
| `order.tracking_url` | Public tracking page URL |
| `order.pricing_breakdown` | Fee breakdown (see [Section 9](#9-pricing--package-limits)) |
| `order.dispatch` | Auto-dispatch result (`assigned`, `attempts`, `message`, optional `rider_id`, `eta_seconds`) |

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `400` | `{ "error": "Missing required fields", "required": [...] }` | Missing a required field |
| `422` | `{ "error": "Business has no active owner account. Cannot create orders." }` | No active OWNER member |
| `422` | `{ "error": "...OUT_OF_COVERAGE..." }` | Pickup or delivery outside service area |
| `503` | `{ "error": "BULK_DELIVERIES_COMING_SOON: ...", "coming_soon": true }` | `package_weight` over `40kg` |
| `500` | `{ "error": "Failed to create order" }` | Unexpected failure |

### 6.2 Create orders in bulk

`POST /api/v1/external/orders/bulk`

Create up to **50** orders in one request. Each element has the same fields as a
single order. The response reports per-item success/failure — a bad item does not
roll back the others.

**Request body**

```json
{
  "orders": [
    {
      "recipient_name": "Ade",
      "recipient_phone": "+2348011111111",
      "pickup_address": "1 Allen Ave, Ikeja",
      "delivery_address": "5 Broad St, Lagos Island",
      "description": "Order #1001"
    },
    {
      "recipient_name": "Tunde",
      "recipient_phone": "+2348022222222",
      "pickup_address": "1 Allen Ave, Ikeja",
      "delivery_address": "9 Bode Thomas, Surulere",
      "description": "Order #1002"
    }
  ]
}
```

**Response `207 Multi-Status`**

```json
{
  "summary": { "total": 2, "created": 2, "failed": 0 },
  "orders": [
    {
      "index": 0,
      "tracking_number": "TRK-A1B2",
      "status": "PENDING",
      "tracking_url": "https://app.traka.com/track/TRK-A1B2",
      "pricing_breakdown": { "base_fee": 500, "distance_fee": 800, "speed_fee": 0, "weight_multiplier": 1, "platform_fee": 195, "total_amount": 1495 }
    }
  ],
  "errors": []
}
```

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `400` | `{ "error": "orders must be a non-empty array" }` | Missing/invalid `orders` |
| `400` | `{ "error": "Maximum 50 orders per bulk request" }` | More than 50 orders |
| `422` | `{ "error": "Business has no active owner account..." }` | No active OWNER member |
| `207` | `errors: [{ "index": 1, "reason": "Missing required fields..." }]` | Per-item failures (not a 4xx) |

### 6.3 Track an order

`GET /api/v1/external/orders/{tracking_number}`

**Response `200 OK`**

```json
{
  "order": {
    "id": "uuid",
    "tracking_number": "TRK-X7K2",
    "status": "IN_TRANSIT",
    "recipient_name": "John Doe",
    "recipient_email": "john@example.com",
    "recipient_phone": "+2348123456789",
    "pickup_address": "12 Marina, Lagos",
    "delivery_address": "44 Ajose Adeogun, Victoria Island, Lagos",
    "description": "Nike Air Force 1 - White",
    "delivery_notes": "Call before delivery",
    "package_size": "SMALL",
    "package_weight": 2,
    "delivery_speed": "EXPRESS",
    "schedule_type": "IMMEDIATE",
    "scheduled_for": null,
    "rider_id": "uuid",
    "rider_has_package": false,
    "eta_minutes": 12,
    "created_at": "2026-08-04T12:00:00.000Z",
    "updated_at": "2026-08-04T12:10:00.000Z",
    "delivered_at": null,
    "cancellation_reason": null,
    "cancellation_note": null,
    "cancelled_at": null,
    "cancelled_by": null,
    "is_guest_delivery": true,
    "tracking_token": "jwt-token",
    "live_tracking": {
      "enabled": true,
      "available": true,
      "source": "REALTIME",
      "websocket_channel": "tracking:package:uuid",
      "rider_location": { "latitude": 6.4393, "longitude": 3.4215, "timestamp": 1754334000, "status": "IN_TRANSIT" }
    },
    "live_tracking_url": "https://app.traka.com/live-track?pkg=uuid&token=jwt-token"
  }
}
```

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `404` | `{ "error": "Order not found" }` | Unknown number or order belongs to another tenant |
| `500` | `{ "error": "Failed to retrieve order" }` | Unexpected failure |

> Orders are tenant-scoped: you can only track orders created by your own business.

### 6.4 Update recipient details

`PATCH /api/v1/external/orders/{tracking_number}/recipient`

Updates one or more recipient fields. At least one field is required. Only orders
in `PENDING` status can be updated. Changing `delivery_address` recalculates the
price and returns the new `pricing_breakdown`.

**Request body** (at least one)

```json
{
  "recipient_name": "John O. Doe",
  "recipient_phone": "+2348133333333",
  "recipient_email": "john.doe@example.com",
  "delivery_address": "50 Ajose Adeogun, Victoria Island, Lagos"
}
```

**Response `200 OK`**

```json
{
  "message": "Recipient updated successfully",
  "tracking_number": "TRK-X7K2",
  "updated_fields": ["recipient_name", "recipient_phone", "recipient_email", "delivery_address"],
  "pricing_breakdown": {
    "base_fee": 500,
    "distance_fee": 1400,
    "speed_fee": 300,
    "weight_multiplier": 1,
    "platform_fee": 440,
    "total_amount": 2640
  }
}
```

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `400` | `{ "error": "At least one field must be provided", "fields": [...] }` | No fields sent |
| `400` | `{ "error": "Cannot update order in IN_TRANSIT status" }` | Order not `PENDING` |
| `404` | `{ "error": "Order not found" }` | Unknown number or other tenant |
| `500` | `{ "error": "Failed to update recipient" }` | Unexpected failure |

### 6.5 Confirm delivery

`POST /api/v1/external/orders/{tracking_number}/confirm`

Marks an order as `DELIVERED` and fires the `order.confirmed` webhook. Safe to call
repeatedly (idempotent).

**Response `200 OK`**

```json
{
  "message": "Delivery confirmed",
  "tracking_number": "TRK-X7K2",
  "status": "DELIVERED"
}
```

If the order is already delivered:

```json
{
  "message": "Order already marked as delivered",
  "status": "DELIVERED"
}
```

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `404` | `{ "error": "Order not found" }` | Unknown number or other tenant |
| `422` | `{ "error": "Cannot confirm a cancelled order" }` | Order was cancelled |
| `500` | `{ "error": "Failed to confirm delivery" }` | Unexpected failure |

---

## 7. Rides API

### Book an on-demand ride

`POST /api/v1/external/rides`

Books a `SAME_DAY` courier ride. The response mirrors orders but is nested under
`ride`.

**Request body**

| Field | Type | Required | Default | Notes |
| ----- | ---- | -------- | ------- | ----- |
| `recipient_name` | string | **yes** | — | Recipient full name |
| `recipient_phone` | string | **yes** | — | Recipient phone number |
| `pickup_address` | string | **yes** | — | Pickup location |
| `delivery_address` | string | **yes** | — | Delivery location |
| `recipient_email` | string | no | — | Delivery notifications |
| `description` | string | no | `On-demand courier booking` | Ride description |
| `delivery_notes` | string | no | — | Rider instructions |
| `package_size` | string | no | `SMALL` | `SMALL`, `MEDIUM`, `LARGE` |
| `package_weight` | number | no | size default | Actual weight in kg (max `40`) |
| `is_fragile` | boolean | no | `false` | Fragile flag |

> `delivery_speed` is forced to `SAME_DAY`, `category` to `On-demand`, and
> `payment_method`/`payment_by` default to `CASH`/`SENDER` for rides. All other
> order rules apply (40kg limit, service-area coverage, tenant scoping).

**Response `201 Created`**

```json
{
  "message": "Ride booked successfully",
  "ride": {
    "id": "uuid",
    "tracking_number": "TRK-Q1W2",
    "status": "PENDING",
    "tracking_url": "https://app.traka.com/track/TRK-Q1W2",
    "dispatch": { "assigned": true, "attempts": 2, "message": "Rider assigned", "rider_id": "uuid", "eta_seconds": 900 },
    "pricing_breakdown": {
      "base_fee": 500,
      "distance_fee": 600,
      "speed_fee": 150,
      "weight_multiplier": 1,
      "platform_fee": 188,
      "total_amount": 1438
    }
  }
}
```

**Errors**

| Status | Body | When |
| ------ | ---- | ---- |
| `400` | `{ "error": "Missing required fields", "required": [...] }` | Missing required field |
| `422` | `{ "error": "Business has no active owner account. Cannot book rides." }` | No active OWNER member |
| `422` | `{ "error": "...OUT_OF_COVERAGE..." }` | Outside service area |
| `503` | `{ "error": "...BULK_DELIVERIES_COMING_SOON...", "coming_soon": true }` | Weight over `40kg` |
| `500` | `{ "error": "Failed to book ride" }` | Unexpected failure |

> Rides are tracked and confirmed exactly like orders (`GET`, `PATCH recipient`,
> `POST confirm` all work with the ride's `tracking_number`).

---

## 8. Order statuses & lifecycle

| Status | Meaning |
| ------ | ------- |
| `PENDING` | Created, awaiting pickup / rider assignment |
| `IN_TRANSIT` | Rider picked up the package, en route |
| `OUT_FOR_DELIVERY` | Rider is at/near the delivery location |
| `DELIVERED` | Delivered and confirmed |
| `CANCELLED` | Cancelled (cannot be confirmed) |

Lifecycle:

```
PENDING ──► IN_TRANSIT ──► OUT_FOR_DELIVERY ──► DELIVERED
    │                                              ▲
    └──────────────── CANCELLED ───────────────────┘
```

- Recipient updates are only allowed in `PENDING`.
- Confirming a `DELIVERED` order is idempotent; confirming a `CANCELLED` order
  returns `422`.

---

## 9. Pricing & package limits

### 9.1 Limits

- **Maximum package weight: 40 kg.** Orders heavier than 40 kg are **coming soon**
  and return `503` with `coming_soon: true` — they are not rejected as validation
  errors, so handle `503` explicitly in your client.
- If `package_weight` is omitted, the size default is used: `SMALL` = 1 kg,
  `MEDIUM` = 5 kg, `LARGE` = 12 kg.

### 9.2 Price calculation

```
subtotal = (base_fee + distance_fee + speed_fee + fuel_adjustment) × weight_multiplier
platform_fee = subtotal × platform_fee_rate
total_amount = subtotal + platform_fee   (rounded)
```

| Component | Value |
| --------- | ----- |
| `base_fee` | ₦500 |
| `distance_fee` | ₦100 / km (straight-line distance) |
| `speed_fee` | `STANDARD` ₦0, `EXPRESS` ₦300, `SAME_DAY` ₦150 |
| `fuel_adjustment` | ₦0 while fuel ≤ ₦1,100/L; scales with distance & fuel price above baseline |
| `weight_multiplier` | ≤5 kg ×1.0, 5–15 kg ×1.25, 15–40 kg ×1.5 |
| `platform_fee_rate` | Business tenants: 15% (configurable via `PLATFORM_FEE_RATE_BUSINESS`) |

**Example `pricing_breakdown`**

```json
{
  "base_fee": 500,
  "distance_fee": 1200,
  "speed_fee": 300,
  "weight_multiplier": 1.25,
  "platform_fee": 312,
  "total_amount": 2312
}
```

### 9.3 Payments

| `payment_method` | Effect |
| ---------------- | ------ |
| `DIGITAL` | Order is `PAID` immediately |
| `CASH` / `BANK_TRANSFER` | `payment_status` is `PENDING` until settled |

---

## 10. Webhooks

Webhooks notify your server in real time when order state changes. TRAKA signs
every delivery so you can verify authenticity.

### 10.1 Managing subscriptions (dashboard API)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/businesses/{business_id}/webhooks` | Create a subscription |
| `GET` | `/api/businesses/{business_id}/webhooks` | List subscriptions |
| `DELETE` | `/api/businesses/{business_id}/webhooks/{webhook_id}` | Delete a subscription |
| `GET` | `/api/businesses/{business_id}/webhooks/{webhook_id}/deliveries` | List recent delivery attempts (latest 50) |

Create:

```http
POST /api/businesses/{business_id}/webhooks
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "url": "https://app.acme.com/traka-webhook",
  "events": ["order.created", "order.delivered", "rider.assigned"]
}
```

Response `201 Created` — note the `secret` is shown **once**:

```json
{
  "message": "Webhook subscription created. Use the secret to verify incoming requests.",
  "webhook": {
    "id": "uuid",
    "tenant_id": "uuid",
    "url": "https://app.acme.com/traka-webhook",
    "secret": "whsec_<random>",
    "events": ["order.created", "order.delivered", "rider.assigned"],
    "status": "ACTIVE",
    "last_delivery_at": null,
    "failure_count": 0,
    "created_at": "2026-08-04T12:00:00.000Z",
    "updated_at": "2026-08-04T12:00:00.000Z"
  }
}
```

**Events**

| Event | Fires when |
| ----- | ---------- |
| `order.created` | An order or ride is created |
| `order.status_changed` | Order status changes (e.g. to `IN_TRANSIT`) |
| `order.delivered` | Order reaches `DELIVERED` via the rider flow |
| `order.confirmed` | Delivery confirmed via the External API |
| `rider.assigned` | A rider is auto-assigned to the order |
| `*` | All of the above (wildcard) |

Rules:

- `url` must be a public `http`/`https` endpoint (private IPs and `localhost`
  are rejected with `400 INVALID_URL`).
- Unknown events are rejected with `400 UNKNOWN_EVENTS: <events>`.
- Subscription requirements: `events` must be a non-empty array.
- Deleting requires `DELETE /api/businesses/{business_id}/webhooks/{webhook_id}`;
  unknown ids return `404`.
- A subscription that fails too many deliveries is **auto-disabled** (status
  `DISABLED`) so it stops burning attempts — see [10.5](#105-delivery-behavior--best-practices).

### 10.2 Delivery format

TRAKA `POST`s the payload to your URL with JSON content type:

```http
POST https://app.acme.com/traka-webhook
Content-Type: application/json
X-Traka-Signature: sha256=5c4e6c7f...
X-Traka-Event: order.created
X-Traka-Delivery-Id: 8f14e45f-ceea-467c-81a9-5c5f3a5c0a23
X-Traka-Timestamp: 1754334000
```

Body:

```json
{
  "event": "order.created",
  "data": { ...event payload... },
  "delivery_id": "8f14e45f-ceea-467c-81a9-5c5f3a5c0a23",
  "timestamp": 1754334000
}
```

- `timestamp` is Unix seconds at delivery time.
- `delivery_id` uniquely identifies this delivery (dedupe on it — retries/slow
  networks may duplicate).

### 10.3 Event payloads

**`order.created`**

```json
{
  "tracking_number": "TRK-X7K2",
  "status": "PENDING",
  "recipient_name": "John Doe",
  "delivery_address": "44 Ajose Adeogun, Victoria Island, Lagos",
  "pricing_breakdown": { "base_fee": 500, "distance_fee": 1200, "speed_fee": 300, "weight_multiplier": 1, "platform_fee": 375, "total_amount": 2875 }
}
```

Rides add `type: "ride"` and `dispatch`:

```json
{
  "tracking_number": "TRK-Q1W2",
  "status": "PENDING",
  "type": "ride",
  "dispatch": { "assigned": true, "attempts": 2, "rider_id": "uuid", "eta_seconds": 900 }
}
```

**`order.status_changed`**

```json
{ "package_id": "uuid", "status": "IN_TRANSIT", "updated_at": "2026-08-04T12:10:00.000Z" }
```

**`order.delivered`**

```json
{ "package_id": "uuid", "status": "DELIVERED", "updated_at": "2026-08-04T13:05:00.000Z" }
```

**`order.confirmed`**

```json
{ "tracking_number": "TRK-X7K2", "status": "DELIVERED" }
```

**`rider.assigned`**

```json
{
  "package_id": "uuid",
  "tracking_number": "TRK-X7K2",
  "rider_id": "uuid",
  "eta_seconds": 1800
}
```

### 10.4 Verifying signatures

Each request is signed with **HMAC-SHA256** using your webhook `secret` over the
**raw request body** (exactly as received):

```
X-Traka-Signature = sha256=<hex(HMAC-SHA256(secret, raw_body))>
```

Always verify before trusting the payload:

**Node.js**

```js
import crypto from "node:crypto";

const secret = process.env.TRAKA_WEBHOOK_SECRET; // whsec_...

function verifySignature(req) {
  const signature = req.headers["x-traka-signature"];
  const timestamp = req.headers["x-traka-timestamp"];
  if (!signature || !timestamp) return false;

  // Optional: reject replays older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const body = JSON.stringify(req.body); // MUST match the raw received body
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

**Python**

```python
import hashlib, hmac

def verify_signature(body: bytes, header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(header, expected)
```

> Use the **raw body bytes**, not a re-serialized object, or the signature check
> will fail. Verify, dedupe on `delivery_id`, then process the event.

### 10.5 Delivery behavior & best practices

Webhook deliveries run through a **durable queue with automatic retries**:

- **Timeout:** 10 seconds per delivery attempt.
- **Retries:** up to 5 retries (6 total attempts) with **exponential backoff** —
  ~30s, 1m, 2m, 4m, 8m after the first attempt. Configurable via
  `WEBHOOK_RETRIES` and `WEBHOOK_RETRY_BASE_MS`.
- **What is retried:** network errors, timeouts, and HTTP `5xx` responses.
- **What is not retried:** HTTP `4xx` responses (e.g. a dead URL returning `404`
  won't self-heal) — the delivery is marked failed and the subscription is
  **auto-disabled**.
- **Exhaustion:** if retries run out, the delivery is marked `DEAD` and the
  subscription is **auto-disabled** so it stops burning attempts. Re-enable it
  by creating a new subscription with a healthy URL.
- **Observability:** inspect every attempt via
  `GET /api/businesses/{business_id}/webhooks/{webhook_id}/deliveries`. Each
  record exposes `status` (`PENDING`/`SUCCEEDED`/`FAILED`/`DEAD`),
  `attempt_count`, `last_status_code`, `last_error`, and `last_attempt_at`.
  The subscription's `failure_count` resets to 0 after a successful delivery.
- **Delivery idempotency:** each delivery carries a unique `delivery_id`. Dedupe
  on it in case a slow network causes a retry to arrive late.

**Receiving best practices**

- Respond `2xx` **as fast as possible** (ideally within 10s). Do heavy work
  asynchronously after responding.
- Return a `4xx` for anything you can never process (invalid signature, unknown
  event) and a `5xx` for transient failures — TRAKA will back off and retry
  `5xx` automatically.
- Verify the `X-Traka-Signature` (see [10.4](#104-verifying-signatures)) before
  trusting the payload.

---

## 11. Error handling

The External API returns structured JSON errors. The shape is consistent across
endpoints:

```json
{ "error": "Human-readable message" }
```

Optional extra fields:

| Field | Meaning |
| ----- | ------- |
| `required` | Array of missing field names (400 on create) |
| `fields` | Array of acceptable fields (400 on recipient update) |
| `coming_soon` | `true` when the feature is not yet available (503) |
| `details` | Internal details, **only in development** |
| `retry_after_seconds` | Rate-limit retry wait (429) |

**Common status codes**

| Code | Meaning |
| ---- | ------- |
| `200` | Success |
| `201` | Resource created |
| `207` | Multi-status (bulk orders — partial success) |
| `400` | Invalid request / missing fields / bad values |
| `401` | Missing or invalid API key |
| `403` | Authenticated but not allowed (dashboard-only, owner/admin) |
| `404` | Order/tracking number not found (or other tenant) |
| `422` | Business misconfiguration or out-of-coverage location |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |
| `503` | Feature coming soon (bulk deliveries over 40 kg) |

**Client checklist**

- Retry `429` using `retry_after_seconds`.
- Treat `503` with `coming_soon: true` as "not available yet" — do not treat it
  as a transient server outage or a validation failure.
- Re-check `207` responses per item; do not assume all orders were created.
- Use exponential backoff for `5xx` and network errors.

---

## 12. API key & webhook management (dashboard)

These endpoints authenticate with your dashboard JWT and require the business
**OWNER** or **ADMIN** role. Members with role `MEMBER` get `403`.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/businesses/{business_id}/api-keys` | Create API key (`{ "name": "..." }`) |
| `GET` | `/api/businesses/{business_id}/api-keys` | List API keys (hashes excluded) |
| `DELETE` | `/api/businesses/{business_id}/api-keys/{key_id}` | Revoke API key |
| `POST` | `/api/businesses/{business_id}/webhooks` | Create webhook subscription |
| `GET` | `/api/businesses/{business_id}/webhooks` | List webhook subscriptions |
| `DELETE` | `/api/businesses/{business_id}/webhooks/{webhook_id}` | Delete webhook subscription |

**Key rotation**

1. Create a new key (get the `raw_key` once).
2. Deploy your app with the new key.
3. Revoke the old key:
   ```http
   DELETE /api/businesses/{business_id}/api-keys/{key_id}
   Authorization: Bearer {jwt}
   ```
   → `200 { "message": "API key revoked successfully" }` or `404`.

Key fields:

| Field | Meaning |
| ----- | ------- |
| `key_prefix` | First 12 chars of the raw key (`sk_live_...`) — use it to identify keys without storing the full value |
| `status` | `ACTIVE` or `REVOKED` |
| `last_used_at` | Last successful authenticated request |
| `expires_at` | Optional expiry (null = never expires) |
| `created_by` | User id that created the key |

---

## 13. Best practices

1. **Store keys safely.** The raw API key and webhook secret are each shown once.
   Store them in a secret manager, never in client-side code or git.
2. **Scope tracking.** Orders are tenant-scoped. Handle `404` for tracking lookups
   as "not found for this business" rather than a blanket error.
3. **Handle partial success.** Bulk responses are `207`; always iterate `errors`.
4. **Treat 503 as coming-soon.** Do not retry 40kg+ orders automatically.
5. **Verify webhooks.** Check the HMAC signature, keep a 5-minute timestamp skew
   tolerance, and dedupe on `delivery_id`.
6. **Prefer `EXPRESS`/`SAME_DAY` consciously.** `SAME_DAY` adds a speed fee and
   `STANDARD` is cheapest.
7. **Update recipient address early.** Recipient changes are only allowed in
   `PENDING` and trigger a re-quote.
8. **Monitor deliveries.** Use
   `GET /api/businesses/{business_id}/webhooks/{webhook_id}/deliveries` to see
   `status`, `attempt_count`, `last_status_code`, and `last_error` per delivery.
---

## 14. Appendix: field reference

### Enums

| Field | Values |
| ----- | ------ |
| `package_size` | `SMALL`, `MEDIUM`, `LARGE` |
| `delivery_speed` | `STANDARD`, `EXPRESS`, `SAME_DAY` |
| `payment_method` | `DIGITAL`, `CASH`, `BANK_TRANSFER` |
| `payment_by` | `SENDER`, `RECIPIENT` |
| `status` | `PENDING`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` |
| `payment_status` | `PENDING`, `PAID`, `FAILED` |
| `weight` default | `SMALL` 1 kg, `MEDIUM` 5 kg, `LARGE` 12 kg |
| `weight` max | 40 kg (above = `503` coming soon) |

### Default weight multipliers

| Weight | Multiplier |
| ------ | ---------- |
| ≤ 5 kg | × 1.0 |
| 5 – 15 kg | × 1.25 |
| 15 – 40 kg | × 1.5 |

### Environment values referenced in this guide

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PLATFORM_FEE_RATE_BUSINESS` | `0.15` | Business platform fee rate |
| `FRONTEND_URL` | — | Base URL for `tracking_url` links |
| `WEBHOOK_RETRIES` | `5` | Max webhook retries (6 total attempts) |
| `WEBHOOK_RETRY_BASE_MS` | `30000` | Base delay for webhook exponential backoff |
| `WEBHOOK_TIMEOUT_MS` | `10000` | Per-attempt webhook delivery timeout |
