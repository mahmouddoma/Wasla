# Wasla Senior Angular Agent — v1.0

**Ready-to-copy `.agents` workspace folder** for Google Antigravity. Designed for healthcare SaaS with dedicated phone UX and reliable Jira-ticket engineering. It separates always-on guardrails, conditional rules, on-demand skills, domain knowledge, and reusable review templates.

**Scope:** Agent instructions/configuration only. It does **not** modify Wasla frontend/backend code, deploy, transition Jira, or verify actual backend endpoints.

## 11 Skills
1. `wasla-domain-model` — role workflows, booking, queue and cross-module implications.
2. `wasla-ui-ux` — clean design system, role UX, visual consistency, a11y, RTL/LTR.
3. `wasla-mobile-experience` — *different* mobile information architecture and touch-first UX.
4. `wasla-angular-engineering` — architecture, typed Angular 20-safe implementation.
5. `wasla-jira-delivery` — acceptance criteria → evidence → cautious Jira completion.
6. `wasla-api-contracts` — backend schema/permission verification, HTTP/SignalR, errors.
7. `wasla-debugging` — reproduce and fix root causes, regression checks.
8. `wasla-quality-gates` — risk-based tests, definition of done, multi-device checks.
9. `wasla-security-permissions` — PHI, roles, backend authority and destructive actions.
10. `wasla-performance` — data-heavy lists, rendering, queue freshness and mobile speed.
11. `wasla-agent-operations` — economical task routing / conflict handling.

**Start:** Read `INSTALL.md`, back up old `.agents`, replace rather than merge the active old skills. `SOURCE_MIGRATION.md` maps the originals to the new responsibilities. This folder is **not** a 1:1 copy of old plugins; legacy source files are retained selectively under `.agents/reference-library/`.

**Validation of this zip:** static file/frontmatter/links checks only. No claim of live Angular, Antigravity, API or Jira execution.
