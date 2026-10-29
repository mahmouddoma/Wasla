# Doctor finance and reports

Applies to `/doctor/finance`, `/doctor/revenue`, `/doctor/expenses`,
`/doctor/salaries`, and `/doctor/reports` (including its insight view).

- Keep server success/error feedback in toasts. Preserve actionable guidance,
  retry controls, concurrency notices, and translated report completeness notes.
- Reuse Wasla headers and slide-over details. Revenue totals share one surface;
  report notes use neutral dividers instead of separate warning cards.
- Translate receipt labels, report date labels, units, and completeness codes.
  Format report numbers and revenue totals using the selected locale.
- Use available content width for layout decisions. Financial transaction rows
  and operating-finance rows adapt for narrow screens; drawer controls wrap.
- Preserve permissions, financial workflows, idempotency, and API contracts.

Browser verification used synthetic, read-only API responses with Arabic/English
and viewport widths 320, 390, 768, 1093, 1366, and 1920. The final matrix covered
86 page/drawer/sidebar checks with no detected document or drawer overflow and
no runtime exceptions. Expenses/salaries used empty states; payments, revenue,
and report details used populated fixtures. No financial mutation was allowed.

Local screenshots and machine-readable results are in `.tmp/finance-responsive/`.
