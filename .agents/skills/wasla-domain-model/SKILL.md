---
name: wasla-domain-model
description: Use for Wasla role workflows, patient booking, reception, doctor, admin, appointments, queue management, and cross-module business-rule analysis.
---

# Wasla domain intelligence
## Discovery protocol
1. Identify user actor, location/clinic scope, permissions, primary task, success outcome and downstream affected roles.
2. Inspect target routes, models, services, server DTOs and Jira acceptance criteria; distinguish observed behavior from product aspiration.
3. Draft a small state/transition matrix for mutation-heavy flows: actor, existing state, action, allowed state, backend response, denied/error handling.
4. Search for cross-module effects (patient → reception → doctor → admin; booking ↔ queue ↔ notifications) without assuming features exist.
5. Validate open questions with project/ticket; do not silently choose policies such as grace period, refunds or auto-confirmation.
## Practical outcomes
- Affected roles and components, validated invariants, unknowns, user-visible states, and regression scenarios.
- Favor efficient clinic workflows: receptionist speed, doctor focus, patient reassurance, admin oversight.
- For queues, appointments and live updates: server authoritative data, ordering, timezone and idempotency rules are critical; do not assume client clocks represent clinical truth.
## References
Read `../../knowledge/wasla-domain.md` and `../../knowledge/patient-booking-policy.md` as necessary.
