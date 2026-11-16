---
name: wasla-api-contracts
description: Use when integrating or debugging Angular HTTP/SignalR with Wasla backend, DTOs, validation, authentication, pagination, mutations and status/state synchronization.
---

# Backend-first API contract integration
## Before coding
1. Find real endpoint on backend routes/controllers/handlers or approved OpenAPI, then DTO/property names, validation, auth policy, error shapes, pagination, timezone and lifecycle.
2. Compare with Angular service and any interceptors; map actual mismatches rather than assuming `/api/v1/...` routes.
3. If backend not accessible: label unverified assumptions; never claim end-to-end integration or ticket completion based on frontend mocks.
## Implementation contract
- Central environment configuration and reusable `HttpClient` patterns; no hardcoded secrets or localhost URLs in production code.
- Strongly typed requests/responses; explicit conversion at boundary only; distinguish transport DTO vs UI view model.
- Distinguish 400/401/403/404/409/422/5xx, network/offline and cancellation. Prefer backend human-readable error safely localized without leaking internals.
- Loading vs no-results vs error must differ; never swallow errors or show success before server confirmation.
- For mutations: prevent duplicate clicks, use idempotency where supported, reconcile server response, recover from concurrent updates; do not blindly retry non-idempotent POSTs.
- For GET: honor actual pagination/filter/sort semantics, optional query params and cache invalidation.
- Dates: use API-prescribed timezone/business date; never parse naive date strings into unintended UTC conversions.
- For live updates/SignalR: unsubscribe/reconnect sanely, deduplicate events, handle gaps/stale events and server-authoritative reconciliation.
## Required evidence
Endpoint path/method + request shape + response shape + auth/role + changed frontend files + exercised response/error cases. Mask payload data.
