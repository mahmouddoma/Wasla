# Wasla domain discovery map — not verified runtime contract

Wasla is a connected healthcare management SaaS. The agent must discover the actual supported roles, routes, services and entities in the checked-out project and the Jira ticket. The categories below guide investigation, not unconditional requirements.

| Role / audience | Primary jobs to verify | Main UX concerns |
|---|---|---|
| Patient | find doctor, book, reschedule/cancel if allowed, queue tickets, family profiles | low cognitive load, Arabic accessibility, mobile confidence, clear fee/status |
| Reception | arrival/check-in, bookings and schedule coordination, queue progress | very fast repeated actions, status visibility, keyboard/touch, error recovery |
| Doctor | daily list, visit context, appointment / queue actions | calm clinical focus, useful context, minimum clicks |
| Clinic / branch admin | staff, schedules, configuration, reporting, access controls | bulk data, consistency, auditability, role scoping |
| Platform admin (if implemented) | tenant/branch/system administration | cross-tenant boundaries, destructive-action safety |

## Discovery checklist
- Where are roles/claims/permissions defined server-side? Are they per user, clinic or branch?
- Which lifecycle states truly exist for bookings, queue tickets, clinics and availability?
- Which actor can perform each transition, when, and how are conflicts prevented?
- Are self-booking, walk-in, payment/fee categories, family accounts or live queue supported in this repository?
- Which operations affect more than one UI module? What happens on 409 conflict, expired auth and live-update gap?
- Where do dates/times come from? Which timezone/business-date policy applies?

## Truth status
- User supplied historical frontend repo pointer: `https://github.com/mahmouddoma/Wasla`
- Historical backend pointer: `https://github.com/LoaiSaberC4r/Wasla`
- These are **references to verify**, not a claim that code was fetched, builds run, endpoints validated or ticket content read during agent-folder construction.
- Jira integration requires an authorized connector/session or ticket text. No Jira credentials are bundled.
