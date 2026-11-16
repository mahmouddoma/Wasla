---
trigger: model_decision
description: "Apply when executing, estimating, reviewing or closing a Jira task or acceptance criteria."
---

# Jira integrity
- Obtain the real ticket content via connected Jira when accessible, otherwise from the supplied ticket text; never guess based on an issue key.
- Trace every acceptance criterion to files, tests and observable results. Check blockers and linked issues.
- Don't treat UI-only work as fulfilling backend-required behavior; explicitly track dependencies and ownership.
- Add concise evidence in Jira if requested and access permits; never auto-transition an unverified ticket to Done.
- Read `wasla-jira-delivery`.
