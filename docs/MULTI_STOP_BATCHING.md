# Multi-Stop Route Batching

## Overview
When a rider is actively carrying a `SAME_DAY` package, they can be offered additional jobs whose **pickup point is within X km of their current route** (current location → current dropoff). They complete pickups along the way, then drop all packages off in order.

---

## 1. Data Model Changes

### `CourierState`
- Add `activeDeliveries: ActiveDelivery[]` — array of packages currently in transit
- Add `maxBatchSize: number` — cap at 3 for motorcycle, 2 for bicycle
- `status` gains a new value: `'BATCHING'` — online and carrying but accepting more

### `PackageModel`
- `batch_id?: string` — groups packages dispatched together to the same rider
- `stop_order?: number` — 1, 2, 3... the sequence the rider visits stops

### DB Migration
New `batch_id` and `stop_order` columns on `packages` table.

---

## 2. Server — MatchingEngine Changes

### New eligibility rule in `filterByVehicleConstraints`
- Riders with `status === 'BUSY'` are currently excluded entirely
- Change: riders with `status === 'BUSY'` AND carrying only `SAME_DAY` packages AND under `maxBatchSize` are eligible — as `'BATCHING'` candidates

### New proximity check — `isOnRoute`
- Takes rider's current location, their current dropoff, and the new pickup
- Calculates if the new pickup is within a **corridor** of the existing route (not just distance from rider)
- Uses a detour threshold: new pickup must not add more than **25% extra distance** to the existing route

### New scoring factor
- Batching riders get a **route efficiency bonus** in `calculateCourierScore` — rewarded for being close to the new pickup already

---

## 3. Server — Dispatch Flow Changes

### `DispatchService.dispatchDelivery`
- Before sequential dispatch to `AVAILABLE` riders, check for eligible `BATCHING` riders first
- If a batching rider is found and on-route → offer them the job first with a shorter timeout (15s vs 30s) since they're already moving

### New endpoint
`PUT /packages/:id/batch-order` — updates stop order when rider reorders their stops

---

## 4. Server — Package Service Changes

### `createPackage`
- After creating the package, `attemptAutoDispatch` checks batching riders first
- If assigned to a batching rider: set `batch_id`, calculate `stop_order` based on route optimisation

### `updatePackageStatus`
- When a rider marks one package `DELIVERED` in a batch, the next stop becomes active
- Notify the customer of the next package in the batch about updated ETA

---

## 5. Rider Mobile — Active Delivery Screen

**Current:** shows one package, one route

**New:**
- Stop list at the top — numbered chips: Stop 1 (Pickup), Stop 2 (Pickup), Stop 1 (Dropoff), Stop 2 (Dropoff)
- When a new batch job is offered, a bottom sheet appears showing:
  - New pickup address
  - Detour distance added (e.g. "+1.2 km")
  - Extra earnings
  - Accept / Decline (15s timer)
- Map shows the full optimised multi-stop route

---

## 6. Customer Mobile — Tracking Screen

**New:** "Your rider is also picking up another parcel nearby — no impact on your delivery time" banner when their rider is in batching mode.

---

## Scope Boundary

- Only `SAME_DAY` packages are batchable (not `EXPRESS` — too time-sensitive, not `STANDARD`)
- Max **3 packages** per batch (motorcycle), **2** (bicycle)
- Batch offer only sent if detour ≤ 25% of original route
- Rider can **decline** any batch offer without penalty
- If rider is carrying a `fragile` package, batching is disabled for that run

---

## Implementation Order

1. DB migration — `batch_id`, `stop_order` on packages
2. `CourierState` model — add `activeDeliveries`, `maxBatchSize`
3. `MatchingEngine` — `isOnRoute` check + batching eligibility
4. `DispatchService` — prioritise batching riders
5. `PackageService` — assign `batch_id` and `stop_order`
6. New API endpoint — `GET /packages/batch/:batchId` for rider to see their full batch
7. Rider mobile — active delivery screen multi-stop UI
8. Customer mobile — tracking screen batch banner
