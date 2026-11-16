---
trigger: model_decision
description: "Apply to patient records, authentication, role permissions, booking mutations, destructive actions, or sensitive clinical data."
---

# Healthcare safety and permission checks
- Never put PHI/PII, auth cookies, tokens, API keys or production responses in generated artifacts, console logs or bug evidence.
- Authorization belongs on the server; UI guards and hidden buttons are not enforcement.
- Verify identity scope/tenant/clinic context and forbidden responses; protect from stale roles or stale patient context.
- Treat cancel, refund, discharge, delete, impersonation and other irreversible actions as high-risk; never create fake backend authority.
- Test with synthetic data, sanitize error payloads, and ask for explicit consent before production side effects.
- Read `wasla-security-permissions` when relevant.
