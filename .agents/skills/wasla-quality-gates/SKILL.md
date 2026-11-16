---
name: wasla-quality-gates
description: Use to validate Jira acceptance criteria, Angular changes, UX responsiveness, accessibility, regression, tests, review and Definition of Done.
---

# Risk-adjusted Definition of Done
## Select test scope
| Change | Minimum evidence | Extra when risk justifies |
| --- | --- | --- |
| Copy/style | affected template/style review and visual check if browser available | touch/RTL screenshot if layout changes |
| Local component | focused typecheck/test + interaction walkthrough | browser viewport check |
| API/mutation | request/response/error tests, concurrency scenario, typecheck | backend integration/test environment |
| Auth/role/booking/queue | permission/negative-state coverage, race/error tests, build | end-to-end across roles |
| Shared architecture | build and related regression checks | broader suite |
## Definition of Done
- Every acceptance criterion mapped to observable evidence, not just developer interpretation.
- UI and business logic reflect actual backend responses, no hardcoded test data on production path.
- Arabic and English with correct RTL/LTR; long names, empty/loading/errors; mobile/tablet/desktop where applicable.
- A11y: focus, names, labels, contrast, zoom, keyboard, touch; no critical interaction available only via hover.
- No leaked PII/secrets, unexpected network calls, console errors, breaking changes or critical open risks.
- Summarize tests executed with commands and pass/fail; clearly mark not run, blocked, or assumed.
## Avoid fake certainty
- `ng build` validates compilation, **not** UX, responsive correctness or API functionality.
- Passing frontend mocks doesn't verify a backend endpoint.
- If no project/browser/backend is present, provide implementation review status, not Verified/Done.
See `../../templates/definition-of-done.md`.
