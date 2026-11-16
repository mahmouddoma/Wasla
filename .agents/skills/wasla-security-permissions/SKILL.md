---
name: wasla-security-permissions
description: Use when working on Wasla authentication, authorization, patient privacy, roles, protected routes, secure API requests and destructive operations.
---

# Healthcare app security and privacy
## Role and ownership
- Confirm backend permissions for actor + clinic/branch + patient ownership + data sensitivity; frontend guards reflect policy but never replace server authorization.
- Check 401 vs 403 states, stale permission cache, deep links/direct URLs, role switch, expired sessions and account-scoped request parameters.
- Never infer authorization from UI being hidden, claim backend safety from a frontend test, or rely on JWT payload alone if server needs revocation/ownership checks.
## Information safety
- No PHI/PII in public error text, console logs, analytics, screenshot evidence or copied Jira comments; use synthetic data and redact bearer tokens/cookies.
- Sensitive form data should not persist to localStorage unless approved threat model and application design explicitly permit.
- Avoid unsafe HTML rendering and untrusted URL navigation; prefer Angular contextual escaping and controlled sanitization.
## High-risk mutations
- Determine confirmation, audit trail, backend validation, CSRF protections as applicable, and reversible/irreversible implications.
- Validate denied, conflict and stale state behavior, and no optimistic 'success' for unconfirmed destructive mutations.
- Escalate production privacy incidents or missing backend enforcement; cannot fix backend authorization via frontend CSS or guards alone.
