# Production Readiness Checklist

## Critical
- [Done] **In-memory package verification state** — `PackageVerificationService` stores pickup/delivery PINs in a class-level `Map`. PINs are lost on restart and won't work across multiple instances. Persist PINs to the `packages` table (columns `pickup_pin`, `delivery_pin` already exist) or Redis with a long TTL.

- [ ] **Rider cleanup and dispatch timeout crons are commented out** — `RiderCleanupCron` and `startDispatchTimeoutCron` are both disabled in `index.ts`. The 360-day auto-hard-delete and dispatch timeout recovery will never run. Re-enable them (or replace `setInterval` with `node-cron`).

- [Done] **`processCashDelivery` has no authentication check** — `wallet.controller.ts` reads `riderId` directly from `req.body` with no auth or ownership check. Any unauthenticated caller can debit any rider's wallet.

- [Done] **Refresh token secret falls back to access token secret** — In `token.service.ts`, `REFRESH_SECRET` falls back to `JWT_SECRET` when `JWT_REFRESH_SECRET` is not set. A compromised access token secret would also compromise all refresh tokens. Set a dedicated `JWT_REFRESH_SECRET` env var and remove the fallback.

---

## High

- [ ] **`console.*` used instead of structured logger** (partially done) — `geocoding.service.ts` and `package.service.ts` are now clean, but **57 `console.*` calls remain in 14+ files**: `user.service.ts:53` (logs full user object), `tenant.controller.ts:46,54`, `MatchingController.ts` (×7), `DispatchService.ts:197`, `rider.service.ts` (×3), `ssrf-protection.ts` (×6), `slack.notification.ts` (×4), `service-area.service.ts:23`, `waitlist.service.ts:46,112`, `commission.service.ts:33`, `business-wallet.service.ts:57`, `image-processing.service.ts`, `scheduling.cron.ts`, `environment.ts`, `instrument.ts`. These bypass the Loki/observability pipeline and can leak internal details. Replace all with `logger`.

- [Done] **Error logger logs full request body and headers** — `errorLogger` in `logging.middleware.ts` logs `req.body` and `req.headers` in full. In production this will write passwords, tokens, and payment data to the log store. Redact or omit sensitive fields.

- [ ] **`requestPayout` never disburses funds** — **NOT fixed despite being marked Done.** `WalletService.requestPayout` (`wallet.service.ts:224-251`) still deducts the balance and records a `WITHDRAWAL` transaction without calling any payment gateway. `KudaGatewayClient.disburseFunds` (`payment-gateway.service.ts:417-443`) is implemented but **never invoked** (no `.disburseFunds(` call site). Riders will lose balance with no actual payout.

- [Done] **Background dispatch queue is never consumed** — `scheduleBackgroundSearch` writes a `dispatch:background:{packageId}` key to Redis but no worker or cron reads and retries it. Packages queued for background search will never get a rider assigned.

- [Done] **Delivery code email TTL is only 5 minutes** — `scheduleDeliveryCodeEmail` stores the delivery PIN with a 300-second TTL. If the rider takes longer than 5 minutes to arrive after the key is written, the recipient never receives their delivery code. Increase the TTL or trigger the email at a later stage (e.g. on `OUT_FOR_DELIVERY` status).

---

## Medium

- [ ] **Migration missing for `system_configs` table** — `SystemConfigModel` was added but has no corresponding migration file. `sequelize.sync({ alter: false })` won't create it in production if migrations are the source of truth. Add a migration under `migrations/`.

- [ ] **Global rate limit is too aggressive for legitimate clients** — 100 requests per 15 minutes per IP will block mobile apps doing live tracking or status polling. Apply tighter limits to auth and payment endpoints specifically, and raise the limit for read-only endpoints.

- [ ] **Graceful shutdown doesn't drain in-flight requests** — `server.close()` in `index.ts` stops accepting connections but the callback fires immediately without waiting for active requests to complete. Use `http-terminator` or track open connections manually.

- [ ] **`recentErrors` Map in `app.ts` can grow unboundedly** — The pruning logic only runs when `size > 100` and only inside the error handler. Under a 5xx spike the map can grow large before pruning. Move pruning to a periodic `setInterval`.

- [ ] **Fake bank account number hardcoded as fallback** — `package.service.ts` falls back to account number `0123456789` and `Guaranty Trust Bank` when `TRAKA_BANK_ACCOUNT_NUMBER` is not set. If the env var is missing in production, users will send real money to a non-existent account. Remove the fallback and throw a configuration error instead.

---

## Low

- [ ] **`console.log` on every startup in `environment.ts`** — Logs the environment name and config file path to stdout on every boot. Replace with `logger` or remove entirely for production.

- [ ] **Dead code: `generateDeepLink` is never called** — `package.service.ts` defines `generateDeepLink` but it is never invoked. Remove it.

- [ ] **Swagger UI is publicly accessible in production** — `/api-docs` has no auth gate. Disable it in production or protect it behind an IP allowlist or basic auth middleware.

- [ ] **`sequelize.sync()` still runs in production** — `database.ts` calls `sequelize.sync({ alter: false })` on every startup. In production, schema changes should come exclusively from migrations. Remove the sync call to prevent accidental schema drift.

---

## Pending Implementation — Consolidated Task List

> Merges all open items from this checklist **and** the Service Area & Waitlist deployment review (see `docs/DEPLOYMENT_CHECKLIST.md`). Verified against the codebase on 2026-08-04. Task order is by priority (High → Medium → Low); approximate.

### Critical (deployment blockers)

- [x] **T1. Fix `scripts/test-service-area.ts`** — imports fixed to `../src/...`; `checkCoverage` calls updated to the new `{ latitude, longitude }` object signature. **DONE 2026-08-04.**
- [x] **T2. Align coverage-check contract** — `checkCoverageSchema` now accepts `?latitude=&longitude=` **or** `?city=&state=` (either pair required); both curl styles from the docs work. **DONE 2026-08-04.**
- [x] **T3. Coordinate-based coverage** — `latitude`/`longitude`/`radius_km` columns added (model + `migrations/2026-08-04-add-geo-columns-to-service-areas.ts`); `checkCoverage` does a Haversine radius check against active area centers, falling back to city/state fuzzy match. Seed script carries coords + radius. **DONE 2026-08-04.** (Run `pnpm migrate:up` then `npx tsx scripts/seed-service-areas.ts` to populate.)
- [x] **T4. Re-enable rider cleanup + dispatch-timeout crons** — `RiderCleanupCron` (`0 2 */3 * *`, `node-cron`) and `startDispatchTimeoutCron` (every minute) re-enabled and wired in `index.ts`. **DONE 2026-08-04.**
- [x] **T5. Implement real payout disbursement** — `PaymentGatewayService.disburseWalletPayout()` added; `WalletService.requestPayout` now calls the gateway before committing and rolls back the deduction on `FAILED`. **DONE 2026-08-04.**

### High

- [x] **T6. Fix `getWaitlistByCity()` aggregation** — replaced the broken `findAll`+`group`+JS-counter with a real `COALESCE(city, location)` / `COUNT(id)` aggregate ordered by count. **DONE 2026-08-04.**
- [x] **T7. Fix geocoding-fallback bypass** — removed the `LAGOS_DEFAULT` fallback and the `!== LAGOS_DEFAULT` skip logic (`package.service.ts`). `createPackage` now fails closed with `LOCATION_VERIFICATION_FAILED` when geocoding can't verify an address, and coverage is always enforced for both pickup and delivery. **DONE 2026-08-04.**
- [x] **T8. Add `system_configs` migration** — `migrations/2026-08-04-create-system-configs.ts` (key PK, value, timestamps). **DONE 2026-08-04.**
- [x] **T9. Finish `console.*` → `logger` migration** — remaining 41 live calls replaced across `user.service.ts` (was logging the full user object incl. hash), `MatchingController.ts` (7), `DispatchService.ts`, `slack.notification.ts` (5), `ssrf-protection.ts`, `rider.service.ts` (3), `tenant.controller.ts`, `waitlist.service.ts` (2), `commission.service.ts`, `image-processing.service.ts`, `business-wallet.service.ts`, `scheduling.cron.ts`. Only intentional console.* remains: `environment.ts` startup banner (pre-logger), `instrument.ts` OTel shutdown, `logger.ts` own Loki error handler, and commented-out code. **DONE 2026-08-04.**
- [x] **T10. Rework global rate limit** — already implemented in merged commit `ce15d3b` (pre-dated the checklist): tiered limiters in `app.ts` — payment 20/15min, standard 300/15min, relaxed 600/15min for `/api/packages/:tracking_number`, `/api/matching/courier-presence`, `/api/matching/available-couriers`, `/api/riders/location`. **DONE 2026-08-04 (verified).**
- [x] **T11. Drain in-flight requests on shutdown** — added `http-terminator` (3.2.0); `index.ts` now terminates with `gracefulTerminationTimeout: 10s` before closing DB connections, so in-flight requests finish instead of being cut by `server.close()`. **DONE 2026-08-04.**
- [x] **T12. Remove hardcoded fake bank account** — `initializeTransferPayment` now throws `TRANSFER_PAYMENT_UNAVAILABLE` when `TRAKA_BANK_ACCOUNT_NUMBER`/`TRAKA_BANK_NAME` are unset; the `0123456789`/`Guaranty Trust Bank` fallback is gone. **DONE 2026-08-04.**

### Low

- [x] **T13. Periodic pruning of `recentErrors` Map** — both dedup maps now pruned by a `setInterval(...).unref()` every 60s: `recentSlackAlerts` (`logging.middleware.ts`) and `recentErrors` (`app.ts`); the inline `size > 100` pruning was removed. **DONE 2026-08-04.**
- [x] **T14. Remove startup `console.log` in `environment.ts`** — dropped the `🌍`/`📁`/`✅` banner logs (pre-logger code; kept `console.warn` fallback + `console.error` for missing env vars so fatal startup errors stay visible). **DONE 2026-08-04.**
- [x] **T15. Remove dead `generateDeepLink`** — removed from `package.service.ts` (verified never referenced). **DONE 2026-08-04.**
- [x] **T16. Gate `/api-docs` in production** — `app.ts` now allows local IPs always; in production non-local requests need basic auth `admin:<SWAGGER_PASSWORD>` (403 if unset), 401 otherwise. **DONE 2026-08-04.** (Set `SWAGGER_PASSWORD` in prod to keep docs reachable remotely.)
- [x] **T17. Remove `sequelize.sync()` in production** — `database.ts` only syncs when `!config.isProduction`; prod relies on `pnpm migrate:up`. **DONE 2026-08-04.**
- [x] **T18. Align env-var docs** — `DEPLOYMENT_CHECKLIST.md` + root `CLAUDE.md` now document `UPSTASH_REDIS_REST_URL`/`_TOKEN` + `TOTP_ENCRYPTION_KEY` as required and drop `REDIS_URL`/`MONGO_URL`. **DONE 2026-08-04.**

### Suggested implementation order

```
T1 → T2/T3 → T4 → T5   (deployment blockers)
T6 → T7 → T8 → T9 → T10 → T11 → T12
T13 → T14 → T15 → T16 → T17 → T18
```
