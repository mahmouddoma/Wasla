const { getWsUrl, evaluateInBrowser } = require('./jira-client.cjs');

async function testCommentAndTransition() {
  const wsUrl = await getWsUrl();
  const testIssueKey = 'WAS-552';

  const commentBody = {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Frontend API endpoint integration completed and verified.\n' +
                '• Endpoint: GET /api/v1/notifications/mine\n' +
                '• Service: src/app/domains/notifications/notifications-api.ts (getMine)\n' +
                '• Models: src/app/domains/notifications/notifications.models.ts\n' +
                '• Unit Tests: src/app/domains/notifications/notifications-api.spec.ts\n' +
                '• Verification: Vitest suite passed, tsc --noEmit passed (0 errors), ng build passed.'
            }
          ]
        }
      ]
    }
  };

  const expr = `
    (async () => {
      // 1. Post comment
      const commentRes = await fetch('/rest/api/3/issue/${testIssueKey}/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(${JSON.stringify(commentBody)})
      });
      const commentData = await commentRes.json();

      // 2. Transition to Done (id: "31")
      const transRes = await fetch('/rest/api/3/issue/${testIssueKey}/transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transition: { id: "31" } })
      });

      // 3. Verify status
      const issueRes = await fetch('/rest/api/3/issue/${testIssueKey}?fields=status');
      const issueData = await issueRes.json();

      return {
        commentStatus: commentRes.status,
        transitionStatus: transRes.status,
        newStatus: issueData.fields?.status?.name
      };
    })()
  `;

  const result = await evaluateInBrowser(wsUrl, expr);
  console.log('Result for ' + testIssueKey + ':', JSON.stringify(result, null, 2));
}

testCommentAndTransition().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
