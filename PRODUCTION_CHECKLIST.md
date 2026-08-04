# Production Readiness Checklist

## Critical
- [ ] **In-memory package verification state** — `PackageVerificationService` stores pickup/delivery PINs in a class-level `Map`. PINs are lost on restart and won't work across multiple instances. Persist PINs to the `packages` table (columns `pickup_pin`, `delivery_pin` already exist) or Redis with a long TTL.

- [ ] **Rider cleanup and dispatch timeout crons are commented out** — `RiderCleanupCron` and `startDispatchTimeoutCron` are both disabled in `index.ts`. The 360-day auto-hard-delete and dispatch timeout recovery will never run. Re-enable them (or replace `setInterval` with `node-cron`).

- [ ] **`processCashDelivery` has no authentication check** — `wallet.controller.ts` reads `riderId` directly from `req.body` with no auth or ownership check. Any unauthenticated caller can debit any rider's wallet.

- [ ] **Refresh token secret falls back to access token secret** — In `token.service.ts`, `REFRESH_SECRET` falls back to `JWT_SECRET` when `JWT_REFRESH_SECRET` is not set. A compromised access token secret would also compromise all refresh tokens. Set a dedicated `JWT_REFRESH_SECRET` env var and remove the fallback.

---

## High

- [ ] **`console.*` used instead of structured logger** — `geocoding.service.ts`, `package.service.ts`, and others call `console.log/warn/error` directly. These logs bypass the Loki/observability pipeline and can leak internal details. Replace all with `logger`.

- [ ] **Error logger logs full request body and headers** — `errorLogger` in `logging.middleware.ts` logs `req.body` and `req.headers` in full. In production this will write passwords, tokens, and payment data to the log store. Redact or omit sensitive fields.

- [ ] **`requestPayout` never disburses funds** — `WalletService.requestPayout` deducts the balance and records a `WITHDRAWAL` transaction but never calls a payment gateway to send money to the rider's bank. Riders will lose balance with no actual payout.

- [ ] **Background dispatch queue is never consumed** — `scheduleBackgroundSearch` writes a `dispatch:background:{packageId}` key to Redis but no worker or cron reads and retries it. Packages queued for background search will never get a rider assigned.

- [ ] **Delivery code email TTL is only 5 minutes** — `scheduleDeliveryCodeEmail` stores the delivery PIN with a 300-second TTL. If the rider takes longer than 5 minutes to arrive after the key is written, the recipient never receives their delivery code. Increase the TTL or trigger the email at a later stage (e.g. on `OUT_FOR_DELIVERY` status).

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
