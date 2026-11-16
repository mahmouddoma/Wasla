---
trigger: model_decision
description: "Apply when choosing tests, browser checks, build steps or optimizing agent tool and token usage."
---

# Risk-based verification and token economy
- Small markup/copy: targeted code review and keyboard/visual check if available. No mandatory full build just for a label.
- Visual/layout: check viewport behavior at narrow mobile, medium tablet and desktop; LTR/RTL and dialogs/states; screenshots only when they prove a change.
- TS business change: relevant typecheck and focused tests; race/error validation when asynchronous.
- Shared auth/router/API contract/security change: build and broader related regression tests where executable.
- Never rerun passing checks without code changes; do not claim tests ran if tools/projects unavailable.
- Limit context/search to changed features; summarize decisions; use skills on demand and never execute inherited scripts automatically.
