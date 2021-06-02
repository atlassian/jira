/* eslint-disable @typescript-eslint/no-var-requires */
import { createApp } from "../utils/probot";

describe('GitHub Actions', () => {
  let app;
  beforeEach(async () => app = await createApp())

  describe('issue_comment', () => {
    describe('created', () => {
      it('should update the GitHub issue with a linked Jira ticket', async () => {
        const payload = require('../fixtures/issue-comment-basic.json');

        const githubApi = td.api('https://api.github.com');
        const jiraApi = td.api(process.env.ATLASSIAN_URL);

        td.when(jiraApi.get('/rest/api/latest/issue/TEST-123?fields=summary'))
          .thenReturn({
            key: 'TEST-123',
            fields: {
              summary: 'Example Issue',
            },
          });

        await app.receive(payload);

        td.verify(githubApi.patch('/repos/test-repo-owner/test-repo-name/issues/comments/5678', {
          number: 'test-issue-number',
          body: 'Test example comment with linked Jira issue: [TEST-123]\n\n[TEST-123]: https://test-atlassian-instance.net/browse/TEST-123',
        }));
      });
    });
  });
});
