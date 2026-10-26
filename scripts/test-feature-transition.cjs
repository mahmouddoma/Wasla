const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

async function testFeatureTransition() {
  const wsUrl = await getWsUrl();
  const testKey = 'WAS-563';

  const commentText = 
    `Frontend Feature UI End-to-End Scenario integration completed and verified.\n` +
    `• Feature: [FE FEATURE 01] Authentication, Session & Password Lifecycle\n` +
    `• UI Components:\n` +
    `  - LoginComponent (src/app/features/auth/login/)\n` +
    `  - ChangePasswordComponent (src/app/features/auth/change-password/)\n` +
    `  - FirstLoginChangePasswordComponent (src/app/features/auth/first-login-change-password/)\n` +
    `• State & Guards:\n` +
    `  - AuthSession (src/app/core/auth/auth-session.ts)\n` +
    `  - FirstLoginGuard (src/app/core/auth/first-login.guards.ts)\n` +
    `• Routes: /login, /change-password, /first-login/change-password\n` +
    `• Test Suites: login.spec.ts, change-password.spec.ts, auth-session.spec.ts, first-login.guards.spec.ts\n` +
    `• Linked API Cards: 8/8 cards completed and moved to Done (WAS-1 .. WAS-8)\n` +
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
      // 1. Post comment
      const commentRes = await fetch('/rest/api/3/issue/${testKey}/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(${JSON.stringify(commentBody)})
      });

      // 2. Transition to Done (id: "31")
      const transRes = await fetch('/rest/api/3/issue/${testKey}/transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transition: { id: "31" } })
      });

      // 3. Check status
      const issueRes = await fetch('/rest/api/3/issue/${testKey}?fields=status');
      const issueData = await issueRes.json();

      return {
        commentStatus: commentRes.status,
        transStatus: transRes.status,
        status: issueData.fields?.status?.name
      };
    })()
  `;

  const result = await evaluateInBrowser(wsUrl, expr);
  console.log('Result for ' + testKey + ':', JSON.stringify(result, null, 2));
}

testFeatureTransition().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
