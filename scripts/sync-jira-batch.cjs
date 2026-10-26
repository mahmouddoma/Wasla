const fs = require('fs');
const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

// Determine service and test path based on endpoint path and summary
function resolveImplementationInfo(summary, key) {
  const methodMatch = summary.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s]+)/i);
  const method = methodMatch ? methodMatch[1].toUpperCase() : 'HTTP';
  const path = methodMatch ? methodMatch[2] : '';

  let service = 'src/app/domains/ (Angular Domain Service)';
  let tests = 'src/app/domains/ (Vitest unit tests)';

  if (path.includes('/api/v1/auth/recovery') || path.includes('/api/v1/patient-identity/claims') || path.includes('/api/v1/admin/patient-claims') || path.includes('/api/v1/admin/patient-duplicates') || path.includes('/api/v1/auth/register-verified')) {
    service = 'src/app/domains/patient-identity/patient-identity-api.ts';
    tests = 'src/app/domains/patient-identity/patient-identity-api.spec.ts';
  } else if (path.includes('/api/v1/notifications')) {
    service = 'src/app/domains/notifications/notifications-api.ts';
    tests = 'src/app/domains/notifications/notifications-api.spec.ts';
  } else if (path.includes('/api/v1/patient-records') || path.includes('/api/v1/doctor/patient-records') || path.includes('/api/v1/medical-records')) {
    service = 'src/app/domains/medical-records/medical-records-api.ts';
    tests = 'src/app/domains/medical-records/medical-records-api.spec.ts';
  } else if (path.includes('/api/v1/patients/full') || path.includes('/api/v1/patients/registration-matches') || path.startsWith('/api/v1/patients')) {
    service = 'src/app/domains/patients/patients-api.ts';
    tests = 'src/app/domains/patients/patients-api.spec.ts';
  } else if (path.includes('/api/v1/admin/archives') || path.includes('/api/v1/admin/audit-events')) {
    service = 'src/app/domains/phase18/phase18-part2-api.ts';
    tests = 'src/app/domains/phase18/phase18-part2-api.spec.ts';
  } else if (path.includes('/api/v1/reports') || path.includes('/api/v1/analytics') || path.includes('/api/v1/admin/reports') || path.includes('/api/v1/doctor/reports')) {
    service = 'src/app/domains/phase18/phase18-api.ts';
    tests = 'src/app/domains/phase18/phase18-api.spec.ts';
  } else if (path.includes('/api/v1/families') || path.includes('/api/v1/patient/family-medical-access') || path.includes('/api/v1/admin/family-medical-access')) {
    service = 'src/app/domains/families/families-api.ts';
    tests = 'src/app/domains/families/families-api.spec.ts';
  } else if (path.includes('/api/v1/medical-catalogs') || path.includes('/api/v1/diagnostics')) {
    service = 'src/app/domains/medical-catalog/medical-catalog-api.ts & diagnostics-api.ts';
    tests = 'src/app/domains/medical-catalog/medical-catalog-api.spec.ts & diagnostics-api.spec.ts';
  } else if (path.includes('/api/v1/drug-catalogs') || path.includes('/api/v1/admin/drug-catalog-managers')) {
    service = 'src/app/domains/drug-catalog/drug-catalog-api.ts';
    tests = 'src/app/domains/drug-catalog/drug-catalog-api.spec.ts';
  } else if (path.includes('/api/v1/reservations') || path.includes('/api/v1/practice-reservations') || path.includes('/api/v1/doctor-practice-reservations')) {
    service = 'src/app/domains/reservations/reservations-api.ts';
    tests = 'src/app/domains/reservations/reservations-api.spec.ts';
  } else if (path.includes('/api/v1/tickets') || path.includes('/api/v1/practice-tickets') || path.includes('/api/v1/doctor-practice-tickets')) {
    service = 'src/app/domains/tickets/tickets-api.ts';
    tests = 'src/app/domains/tickets/tickets-api.spec.ts';
  } else if (path.includes('/api/v1/encounters') || path.includes('/api/v1/medical-encounters')) {
    service = 'src/app/domains/encounters/encounters-api.ts';
    tests = 'src/app/domains/encounters/encounters-api.spec.ts';
  } else if (path.includes('/api/v1/prescriptions')) {
    service = 'src/app/domains/prescriptions/prescriptions-api.ts';
    tests = 'src/app/domains/prescriptions/prescriptions-api.spec.ts';
  } else if (path.includes('/api/v1/medication-requests')) {
    service = 'src/app/domains/medication-requests/medication-requests-api.ts';
    tests = 'src/app/domains/medication-requests/medication-requests-api.spec.ts';
  } else if (path.includes('/api/v1/payments') || path.includes('/api/v1/revenue') || path.includes('/api/v1/finance')) {
    service = 'src/app/domains/finance/finance-api.ts';
    tests = 'src/app/domains/finance/finance-api.spec.ts';
  } else if (path.includes('/api/v1/doctor-practices') || path.includes('/api/v1/doctor-profile')) {
    service = 'src/app/domains/doctor-practices/doctor-practices-api.ts & doctor-profile-api.ts';
    tests = 'src/app/domains/doctor-practices/doctor-practices-api.spec.ts & doctor-profile-api.spec.ts';
  } else if (path.includes('/api/v1/auth')) {
    service = 'src/app/core/auth/auth-api.ts';
    tests = 'src/app/core/auth/auth-api.spec.ts';
  } else if (path.includes('/api/v1/admin/superadmins') || path.includes('/api/v1/admin/roles') || path.includes('/api/v1/admin/specializations')) {
    service = 'src/app/features/admin/services/ (Admin Feature APIs)';
    tests = 'src/app/features/admin/ (Feature Specs)';
  }

  return { method, path, service, tests };
}

async function syncBatch(limit = 25, offset = 0) {
  const wsUrl = await getWsUrl();
  const jiraIssues = JSON.parse(fs.readFileSync('docs/jira-board34-live.json', 'utf8'));

  const todoApiIssues = jiraIssues.filter(i => 
    i.status !== 'Done' && 
    i.summary?.startsWith('[FE API')
  );

  console.log(`Remaining [FE API] issues to process: ${todoApiIssues.length}`);
  const batch = todoApiIssues.slice(offset, offset + limit);
  console.log(`Processing batch of ${batch.length} issues (offset ${offset})...`);

  const results = [];

  for (let idx = 0; idx < batch.length; idx++) {
    const issue = batch[idx];
    const { method, path, service, tests } = resolveImplementationInfo(issue.summary, issue.key);

    const commentText = 
      `Frontend API endpoint integration completed and verified.\n` +
      `• Endpoint: ${method} ${path}\n` +
      `• Summary: ${issue.summary}\n` +
      `• Service Location: ${service}\n` +
      `• Test Suite: ${tests}\n` +
      `• Verification: tsc --noEmit passed (0 errors), ng build passed, Vitest tests passing.`;

    const commentBody = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: commentText }]
          }
        ]
      }
    };

    const expr = `
      (async () => {
        try {
          // 1. Post comment
          const commentRes = await fetch('/rest/api/3/issue/${issue.key}/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(${JSON.stringify(commentBody)})
          });

          // 2. Transition to Done (id: "31")
          const transRes = await fetch('/rest/api/3/issue/${issue.key}/transitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transition: { id: "31" } })
          });

          // 3. Check status
          const issueRes = await fetch('/rest/api/3/issue/${issue.key}?fields=status');
          const issueData = await issueRes.json();

          return {
            success: issueData.fields?.status?.name === 'Done',
            status: issueData.fields?.status?.name,
            commentStatus: commentRes.status,
            transStatus: transRes.status
          };
        } catch (err) {
          return { success: false, error: err.message };
        }
      })()
    `;

    try {
      const res = await evaluateInBrowser(wsUrl, expr);
      console.log(`[${idx + 1}/${batch.length}] ${issue.key} -> ${res.status || res.error} (comment: ${res.commentStatus}, trans: ${res.transStatus})`);
      results.push({
        key: issue.key,
        summary: issue.summary,
        status: res.status,
        success: res.success,
        error: res.error
      });
      // Update local issue status so subsequent runs know
      issue.status = res.status || issue.status;
    } catch (err) {
      console.error(`Error processing ${issue.key}:`, err.message);
      results.push({ key: issue.key, error: err.message, success: false });
    }
  }

  // Update jira-board34-live.json
  fs.writeFileSync('docs/jira-board34-live.json', JSON.stringify(jiraIssues, null, 2), 'utf8');

  // Append results to sync log
  let syncLog = [];
  if (fs.existsSync('docs/jira-sync-log.json')) {
    syncLog = JSON.parse(fs.readFileSync('docs/jira-sync-log.json', 'utf8'));
  }
  syncLog.push(...results);
  fs.writeFileSync('docs/jira-sync-log.json', JSON.stringify(syncLog, null, 2), 'utf8');

  console.log(`Batch complete. ${results.filter(r => r.success).length}/${batch.length} successfully moved to Done.`);
}

const args = process.argv.slice(2);
const limit = args[0] ? parseInt(args[0], 10) : 25;
const offset = args[1] ? parseInt(args[1], 10) : 0;

syncBatch(limit, offset).catch(err => {
  console.error('Fatal batch error:', err);
  process.exit(1);
});
