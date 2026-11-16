---
name: wasla-agent-operations
description: Use to route Wasla tasks across skills, reduce duplicated prompts and token use, resolve conflicting agent instructions, or audit the agent folder itself.
---

# Skill orchestration and cost management
## Pick one lead skill
- UX design: `wasla-ui-ux`; add mobile skill only when needed.
- Mobile/mobile-heavy: `wasla-mobile-experience`; UI skill optional.
- Ticket: `wasla-jira-delivery`; add 1–2 specialists based on the risk.
- Bug: `wasla-debugging`; if network mismatch add API skill.
- Security: `wasla-security-permissions`; add quality skill for critical checks.
- Architecture: `wasla-angular-engineering`; optionally domain or API.
## Token rules
- Only read target folders and adjacent dependencies; do not auto-open all knowledge files or the whole repo.
- Do not run bundled third-party scripts blindly. No automatic external downloads, package installs, browser tours or screenshots unless justified.
- Use terse acceptance maps on simple work, detailed matrices only for cross-module/high-risk tickets.
- Batch related file reads and tool calls; avoid replaying failed tests without a specific change; no unrequested broad refactors.
## Conflicts
Explicit user requirement → observed repository/business/API contract → `.agents/AGENTS.md` safety/invariants → selectively triggered rules → relevant skill → optional original references. For policy or permissions conflict, stop before unsafe action and surface it; don't silently override a known contract.
## Finish
Tell the user what you did, which checks actually ran and what's left. Keep it concise unless the user requested details.
