---
name: wasla-debugging
description: Use for UI bugs, broken requests, Angular errors, RTL issues, stale states, race conditions, console/network failures and root-cause analysis.
---

# Root-cause debugging
## Reproduce → isolate → correct → verify
1. Record exact symptom, expected behavior, relevant route/role/device, reproduction steps and whether the issue is deterministic.
2. Trace UI event → component → state/service → HTTP/SignalR → response → change detection/render. Inspect smallest suspect chain.
3. Seek evidence: browser console/network, code paths and logs stripped of PII. Never paste real patient bodies or tokens.
4. Form 1–3 hypotheses; test cheapest falsifying observation first; distinguish API fault, frontend mapping, state freshness, race and layout/RTL issue.
5. Fix the cause, not symptoms; avoid arbitrary setTimeout, duplicate subscriptions, `!important` cascades, forced reload and silent catch.
6. Add focused regression test that would fail on the old bug when practical; verify affected roles/devices.
## Report
**Root cause**, evidence, exact fix, check performed, any remaining unverified dependencies. If cannot reproduce, state which facts are missing instead of fabricating certainty.
