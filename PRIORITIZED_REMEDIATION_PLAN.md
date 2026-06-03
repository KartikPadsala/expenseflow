# ExpenseFlow Prioritized Remediation Plan

**Generated:** 2026-06-03  
**Based on:** PRODUCTION_READINESS_REPORT.md  
**Total items:** 42 actionable tasks across 4 priority tiers  

Each task includes: estimated effort, owner area, and whether it can be done without other tasks.

---

## Priority Tiers

| Tier | Label | Meaning | Timeline |
|------|-------|---------|----------|
| P0 | 🔴 Critical / Blocker | Security vulnerability or data loss — must fix before any production traffic | Week 1–2 |
| P1 | 🟠 High | Data integrity or major feature gap — fix before soft launch | Week 2–4 |
| P2 | 🟡 Medium | Performance or UX degradation — fix before full public release | Week 4–6 |
| P3 | 🟢 Nice to Have | Polish, optimization, future-proofing | Week 6+ |

---

## P0 — Critical Blockers (Must fix before ANY production traffic)

### P0-1 · Fix JWT Secret Fallback
**Risk:** Authentication bypass — anyone can forge tokens  
**File:** `apps/api/src/auth/strategies/jwt.strategy.ts` line 16, `jwt-refresh.strategy.ts` line 13  
**Fix:** Add startup environment validation that throws if `JWT_SECRET` or `JWT_REFRESH_SECRET` is missing or equals the `.env.example` default. Remove `|| 'default-secret'` fallbacks. Use `@nestjs/config` with Joi schema validation.  
**Effort:** 2h  

---

### P0-2 · Add HTTP Security Headers (Helmet)
**Risk:** Clickjacking, MIME sniffing, missing HSTS  
**File:** `apps/api/src/main.ts`  
**Fix:** Install `helmet` package and call `app.use(helmet())` in `bootstrap()`. Configure CSP appropriately. Also add to web/admin Next.js `next.config.js` headers.  
**Effort:** 2h  

---

### P0-3 · Guard Swagger in Production
**Risk:** Full API schema exposed publicly  
**File:** `apps/api/src/main.ts`  
**Fix:** Wrap `SwaggerModule.setup(...)` in `if (process.env.NODE_ENV !== 'production')`. Add a note in deployment docs.  
**Effort:** 30min  

---

### P0-4 · Add RBAC to Admin Portal API Calls
**Risk:** Any authenticated user can access admin functions  
**Files:** `apps/api/src/*` — create admin module; apply `@Roles(UserRole.ADMIN)` + `RolesGuard` on admin-only endpoints  
**Fix:**
1. Create `apps/api/src/admin/admin.module.ts` with dedicated admin controller
2. Add admin-only endpoints: user management, global stats, audit log access
3. Apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` to all admin endpoints
4. Remove admin stats from user-facing analytics endpoints
5. Update admin portal to use admin-specific endpoints  
**Effort:** 1–2 days  

---

### P0-5 · Fix Settlement Race Condition with DB Unique Constraint
**Risk:** Duplicate PENDING settlements created under concurrent load  
**File:** `packages/database/prisma/schema.prisma`, `apps/api/src/settlements/settlements.service.ts`  
**Fix:** Add a partial unique index on Settlement:
```prisma
@@unique([payerId, payeeId, groupId, status], map: "unique_pending_settlement",
  fields: [payerId, payeeId, groupId], where: { status: PENDING })
```
Since Prisma doesn't support partial indexes natively, use `@@index` + an `unsupported()` raw migration, OR wrap the `findFirst`+`create` in a `$transaction` with serializable isolation. Also wrap `bulkCreate` in a single `$transaction`.  
**Effort:** 4h  

---

### P0-6 · Fix Offline Sync Pull Limit
**Risk:** Users with >50 expenses silently lose data after reinstall  
**File:** `apps/mobile/lib/sync-engine.ts` — `pullFromServer` function  
**Fix:** Implement paginated pull using `while (page <= totalPages)` loop, or use a cursor-based approach. Update the pull to store last-known server timestamp and only fetch changes since then.  
**Effort:** 4h  

---

### P0-7 · Implement Refresh Token Revocation
**Risk:** Stolen refresh tokens valid for 30 days with no revocation path  
**Files:** `apps/api/src/auth/auth.service.ts`, schema  
**Fix:** Store refresh tokens in a `RefreshToken` table (userId, tokenHash, expiresAt, revokedAt). On logout: set `revokedAt = now()`. On refresh: validate token exists and is not revoked. Optionally implement refresh token rotation.  
**Effort:** 1 day  

---

### P0-8 · Add Environment Validation at Startup
**Risk:** App starts with missing secrets, causing silent failures  
**File:** `apps/api/src/app.module.ts`  
**Fix:** Install `joi`. In `ConfigModule.forRoot()`, add `validationSchema: Joi.object({ JWT_SECRET: Joi.string().min(32).required(), DATABASE_URL: Joi.string().required(), ... })`. This causes the process to exit with a clear error if required env vars are missing.  
**Effort:** 2h  

---

### P0-9 · Remove Default Admin Credentials from .env.example
**Risk:** Weak default `Admin@12345` committed to repo  
**File:** `.env.example`  
**Fix:** Replace `ADMIN_PASSWORD=Admin@12345` with `ADMIN_PASSWORD=<set-a-strong-password>`. Add a setup script that generates random secrets on first run.  
**Effort:** 30min  

---

## P1 — High Priority (Fix before soft launch)

### P1-1 · Implement Audit Logging
**Risk:** No audit trail for financial operations  
**Files:** `apps/api/src/expenses/expenses.service.ts`, `settlements/`, `groups/`  
**Fix:** Create an `AuditService` that writes to the existing `AuditLog` model. Call it from:
- `expenses.service.ts`: create, update, delete
- `settlements.service.ts`: complete, cancel
- `groups.service.ts`: member add/remove, role change
- `auth.service.ts`: login, password reset  
**Effort:** 1 day  

---

### P1-2 · Fix Settlement Stats Multi-Currency Aggregation
**Risk:** `totalOwed`/`totalOwing` sums mixed currencies, producing nonsensical numbers  
**File:** `apps/api/src/settlements/settlements.service.ts` — `getStats`  
**Fix:** Convert all settlement amounts to the user's `defaultCurrency` before summing. Use `ExchangeRatesService.convertAmount`. Return per-currency breakdown as well.  
**Effort:** 3h  

---

### P1-3 · Add Strict Rate Limiting to Sensitive Endpoints
**Risk:** Brute-force, credential stuffing, OCR cost abuse  
**File:** `apps/api/src/auth/auth.controller.ts`, `apps/api/src/ocr/ocr.controller.ts`  
**Fix:** Use `@Throttle({ default: { ttl: 60000, limit: 5 } })` on `/auth/login`, `/auth/register`, `/auth/forgot-password`. Use `@Throttle({ default: { ttl: 60000, limit: 10 } })` on `/ocr/scan`.  
**Effort:** 1h  

---

### P1-4 · Fix Recurring Expense Cron Race Condition
**Risk:** Multiple API instances fire the same cron job simultaneously, creating duplicate recurring expenses  
**Files:** `apps/api/src/recurring/recurring.scheduler.ts`, `recurring.service.ts`  
**Fix:** Use Redis-based distributed locking (Redlock pattern via `ioredis`). In `handleDailyProcessing`, attempt to acquire a lock key like `recurring:process:YYYY-MM-DD` with 5-minute TTL before processing. Only proceed if lock acquired.  
**Effort:** 4h  

---

### P1-5 · Add Health Check Endpoint
**Risk:** Load balancers cannot determine API readiness  
**Fix:** Install `@nestjs/terminus`. Create `GET /api/v1/health` that checks database connectivity and Redis connectivity. Return `{ status: 'ok' | 'error', checks: {...} }`.  
**Effort:** 2h  

---

### P1-6 · Add API Typecheck to CI
**Risk:** TypeScript errors in API code go undetected until runtime  
**File:** `.github/workflows/ci.yml`  
**Fix:** Add `- run: pnpm --filter @expenseflow/api typecheck` to the `typecheck` job. Fix any existing TypeScript errors.  
**Effort:** 2h + fix time  

---

### P1-7 · Add Database Migration Step to Deploy Pipeline
**Risk:** Schema drift between deployed app and database  
**File:** `.github/workflows/deploy-api.yml`  
**Fix:** Add a deployment step that runs `prisma migrate deploy` against the production database before starting the new container. Ensure migrations are idempotent.  
**Effort:** 3h  

---

### P1-8 · Require Email Verification Before Transactional Actions
**Risk:** Users can create expenses/settlements without verified email  
**File:** `apps/api/src/auth/auth.service.ts` — `login`; and `JwtStrategy.validate`  
**Fix:** Option A: Block login for unverified users (strictest). Option B: Add `isEmailVerified` to JWT payload and check it in `JwtStrategy.validate` for write operations. Option C: Only block financial operations if unverified. Recommended: Option A with grace period.  
**Effort:** 3h  

---

### P1-9 · Add Idempotency Keys for Expense Creation
**Risk:** Network retries create duplicate expenses  
**Files:** `apps/api/src/expenses/expenses.controller.ts`, `expenses.service.ts`  
**Fix:** Accept `X-Idempotency-Key` header on `POST /expenses`. Store key in Redis with 24h TTL. If key already exists, return cached response instead of creating a new expense.  
**Effort:** 4h  

---

### P1-10 · Fix `isSettled` Flag on ExpenseParticipant
**Risk:** Stale flag causes incorrect state in any UI that reads it  
**File:** `apps/api/src/settlements/settlements.service.ts` — `complete`  
**Fix:** When a settlement completes, update `ExpenseParticipant.isSettled = true` for participants whose full `owedAmount` has been covered. Query the sum of all `COMPLETED` settlements for that participant and compare against `owedAmount`.  
**Effort:** 4h  

---

### P1-11 · Fix FCM v1 Push Notifications
**Risk:** Push notifications silently fail after Google FCM v1 deprecation of legacy API  
**File:** `apps/api/src/notifications/push-delivery.processor.ts`  
**Fix:** Set `useFcmV1: true` in `new Expo({ useFcmV1: true })`. Ensure FCM service account credentials are configured. Test delivery end-to-end.  
**Effort:** 2h + config  

---

### P1-12 · Validate Settlement Amount Against Outstanding Debt
**Risk:** Users can create settlements for amounts exceeding actual debt  
**File:** `apps/api/src/settlements/settlements.service.ts` — `create`  
**Fix:** Before creating a settlement, compute the outstanding balance between payer and payee in the given group using `getBalances`. Reject if `amount > outstandingBalance + tolerance`.  
**Effort:** 3h  

---

### P1-13 · Add Notification Preferences
**Risk:** No opt-out → GDPR/privacy compliance issues  
**Fix:** Add `NotificationPreferences` model or JSON column on User. Create `PATCH /users/me/notification-preferences`. Check preferences before enqueuing notifications in `NotificationsService`.  
**Effort:** 1 day  

---

## P2 — Medium Priority (Fix before full public release)

### P2-1 · Fix N+1 Currency Conversion in `getBalances`
**Risk:** Performance degrades quadratically for large groups with multi-currency expenses  
**File:** `apps/api/src/groups/groups.service.ts` — `getBalances`  
**Fix:** Batch all currency conversion calls: collect unique (fromCurrency, toCurrency, date) pairs first, then fetch all rates in a single query, then apply to the balance map.  
**Effort:** 4h  

---

### P2-2 · Fix N+1 in Analytics `getTrends`
**Risk:** 6 separate DB queries per analytics load  
**File:** `apps/api/src/analytics/analytics.service.ts` — `getTrends`  
**Fix:** Replace the loop with a single query using `GROUP BY DATE_TRUNC('month', date)`. Use `prisma.$queryRaw` or Prisma's `groupBy`.  
**Effort:** 3h  

---

### P2-3 · Add PostgreSQL Full-Text Search Index
**Risk:** LIKE queries will degrade beyond ~50k expenses  
**File:** `packages/database/prisma/schema.prisma`  
**Fix:** Add a Prisma migration that creates a `tsvector` column on `Expense(description, notes)` with a `GIN` index. Update `SearchService` and `ExpensesService.findAll` to use `to_tsquery` instead of LIKE for text search. Use `prisma.$queryRaw` with a parameterized query.  
**Effort:** 1 day  

---

### P2-4 · Add Notification Cleanup Job
**Risk:** `Notification` table grows unbounded  
**Fix:** Add a scheduled job (weekly) that deletes notifications older than 90 days. Add `@@index([createdAt])` if not present.  
**Effort:** 2h  

---

### P2-5 · Add Test Coverage for Auth, Analytics, Users, Friends
**Risk:** Core flows untested  
**Fix:** Write unit tests for:
- `auth.service.spec.ts`: register, login, refresh, verifyEmail, forgotPassword, resetPassword, googleLogin
- `analytics.service.spec.ts`: getSpending, getCategoryBreakdown, getTrends
- `users.service.spec.ts`: getMe, updateMe, deleteMe, search
- `friends.service.spec.ts`: sendRequest, acceptRequest, removeFriend  
**Effort:** 2 days  

---

### P2-6 · Add Real-Time Notification Delivery
**Risk:** 60s polling delay degrades UX  
**Fix:** Implement Server-Sent Events (SSE) endpoint `GET /notifications/stream` using NestJS `@Sse()`. Subscribe to a Redis pub/sub channel per user. Push new notification events. Client switches from polling to SSE connection.  
**Effort:** 2 days  

---

### P2-7 · Implement Incremental/Delta Sync
**Risk:** Full re-fetch of 50 items on every sync is wasteful  
**Fix:** Add `updatedAfter` timestamp parameter to `GET /expenses` and `GET /groups`. Store `last_pull_at` in sync metadata. On pull, only fetch records modified since `last_pull_at`.  
**Effort:** 1 day  

---

### P2-8 · Complete Admin Portal Real Data
**Risk:** Admin dashboard shows hardcoded `'—'` values  
**File:** `apps/admin/src/app/admin/dashboard/page.tsx`  
**Fix:** Create admin API endpoints (behind RBAC, see P0-4) for system stats. Connect dashboard cards to real data.  
**Effort:** 1 day  

---

### P2-9 · Add Apple Sign In
**Risk:** Missing feature from product spec; iOS users expect it  
**Fix:** Install `passport-apple`. Create `apps/api/src/auth/strategies/apple.strategy.ts`. Add `AuthController` Google-style routes for Apple. Handle token verification and user linking.  
**Effort:** 1–2 days  

---

### P2-10 · Add Notification Read-on-Navigate
**Risk:** Notifications remain unread even after user navigates to the referenced entity  
**Fix:** In mobile and web deep link handlers, call `markRead(notificationId)` when navigating from a notification.  
**Effort:** 3h  

---

### P2-11 · Migrate RecurringExpense.participantsJson to Proper Relation
**Risk:** Type safety, query difficulty, migration complexity grows over time  
**Fix:** Create `RecurringExpenseParticipant` table. Write Prisma migration. Update `RecurringService` to use the relation.  
**Effort:** 1 day  

---

### P2-12 · Password Strength Validation
**Risk:** Users can set `password: '1'`  
**File:** `apps/api/src/auth/dto/register.dto.ts`  
**Fix:** Add `@MinLength(8)`, `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)` validators. Add matching validation on password reset DTO.  
**Effort:** 1h  

---

## P3 — Nice to Have (Post-launch improvements)

### P3-1 · Add Cursor-Based Pagination
Replace offset pagination with cursor-based pagination across all `findMany` endpoints. Prevents performance degradation and duplicate results under concurrent writes.  
**Effort:** 2 days  

---

### P3-2 · Add Infrastructure as Code (Terraform/Pulumi)
Define production infrastructure: managed PostgreSQL (e.g., RDS), managed Redis (ElastiCache), S3 bucket, ECS/K8s cluster, load balancer, ACM certificate, CloudFront CDN.  
**Effort:** 3–5 days  

---

### P3-3 · Add Request Correlation IDs
Add middleware to generate `X-Request-ID` header and include it in all log entries. Enables distributed tracing.  
**Effort:** 2h  

---

### P3-4 · Add Currency Validation on Expense Creation
Validate that `currency` is a valid ISO 4217 code. Use a static list from `@expenseflow/shared`.  
**Effort:** 1h  

---

### P3-5 · OCR Result Persistence
Store OCR results in a `PendingReceiptScan` table linked to the user. Allow retrieval from expense create screen. Auto-expire after 24h.  
**Effort:** 4h  

---

### P3-6 · Add Missing Indexes
- `Settlement`: add index on `(status, createdAt)` for history queries
- `Expense`: add GIN index for full-text search (see P2-3)
- `User.pushTokens`: normalize to separate table  
**Effort:** 4h  

---

### P3-7 · Add Offline Sync for Settlements and Friends
Currently only expenses and groups are synced offline. Add `CREATE_SETTLEMENT`, `COMPLETE_SETTLEMENT` to sync queue.  
**Effort:** 1 day  

---

### P3-8 · Add Staging Environment to CI/CD
Add a `staging` branch workflow that deploys to a staging cluster before `main` can be promoted to production. Include database migration dry-run.  
**Effort:** 2 days  

---

### P3-9 · Add Time Zone Awareness to Analytics
`startOfMonth()`/`endOfMonth()` in `analytics.service.ts` use server UTC time. Pass user's `timezone` from JWT or profile to analytics queries.  
**Effort:** 3h  

---

### P3-10 · Add Group-Level Analytics
Add `GET /analytics/group/:id/spending` and category breakdown for group context. Required for group detail page analytics tab.  
**Effort:** 4h  

---

## Remediation Roadmap

```
Week 1:  P0-1, P0-2, P0-3, P0-8, P0-9     (security hardening)
Week 2:  P0-4, P0-5, P0-7, P1-5            (RBAC, settlements, health)
Week 3:  P0-6, P1-1, P1-2, P1-3, P1-6     (sync, audit, rate limiting)
Week 4:  P1-4, P1-7, P1-8, P1-9, P1-10    (concurrency, deploy pipeline)
Week 5:  P1-11, P1-12, P1-13, P2-5        (push, validation, tests)
Week 6:  P2-1, P2-2, P2-3, P2-6, P2-8     (performance, real-time, admin)
Week 7+: P2-x remaining, then P3 backlog
```

---

## Effort Summary

| Priority | Count | Estimated Total Effort |
|----------|-------|----------------------|
| P0 | 9 | ~4 days |
| P1 | 13 | ~8 days |
| P2 | 12 | ~10 days |
| P3 | 10 | ~8 days |
| **Total** | **44** | **~30 dev-days** |

