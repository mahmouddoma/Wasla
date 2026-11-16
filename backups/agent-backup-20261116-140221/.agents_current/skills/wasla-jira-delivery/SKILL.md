---
name: wasla-jira-delivery
description: Use when the user provides a Jira ticket/key, wants a task implemented, acceptance criteria checked, Jira updated, or task marked Done.
---

# Jira ticket → dependable delivery
## 1. Fetch and understand
- If Jira connector is available, read ticket description, acceptance criteria, subtasks, linked issues, comments and relevant attachments. Otherwise use user-supplied ticket; never infer details from an ID.
- Classify: UI, business logic, API, security, data, cross-role. Find dependencies and scope.
- For small obvious tickets proceed directly. For ambiguous policy, security or irreversible changes, surface blocking question instead of inventing rule; continue safe independent work.
## 2. Build acceptance map
For each criterion: expected behavior, UI/API code location, happy path, edge case, verification method, evidence and status. See `../../templates/jira-acceptance-matrix.md`.
## 3. Trace architecture and contracts
Inspect only relevant components/routes/service/model/guard/interceptor and related backend endpoint/DTO when available. Confirm authority for statuses, dates, roles and transitions; do not edit backend without authorization.
## 4. Implement end-to-end
- Include negative/empty/loading/timeout/409/403 cases, i18n and mobile, accessible confirmation/feedback.
- Keep client state consistent with server, handle duplicate submit, stale data, race conditions and cleanup.
- Ensure changes don't break other actor workflows.
## 5. Validate and report
Run focused checks in `wasla-quality-gates`, add/update tests proportional to risk, and report unmet criteria and proof. Never mark ticket Done merely because code exists.
## 6. Jira write-back
Only if requested and connected/permitted: comment concise implementation + verification + blockers. Transition to Done only when all mandatory criteria proven, required reviews/deployments complete per workflow, and authorization is present. Otherwise keep current state and say why. Do not pretend a transition happened.
