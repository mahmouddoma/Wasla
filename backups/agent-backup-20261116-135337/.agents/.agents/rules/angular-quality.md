---
trigger: model_decision
description: "Apply when editing Angular TypeScript, routing, forms, services, components or shared architecture."
---

# Angular implementation guardrails
- Confirm Angular, TypeScript and RxJS versions from local manifests before proposing new framework APIs.
- Favor feature ownership. Components render and coordinate; services/facades handle orchestration where warranted; no feature domain rules hidden in shared/UI helpers.
- Strict request/response typing, narrow side effects, predictable cancellation/subscription cleanup, accessible templates.
- Guard existing contracts, routes, auth and translations. No new architectural layers unless change impact requires them.
- Follow existing Bootstrap 5 / Angular Material usage when installed. Do not mix competing UI libraries gratuitously.
- Read `wasla-angular-engineering` for implementation decisions; `wasla-api-contracts` for backend integration.
