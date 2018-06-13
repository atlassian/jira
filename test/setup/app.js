const { createRobot } = require('probot')
const { findPrivateKey } = require('probot/lib/private-key')
const cacheManager = require('cache-manager')
const createGitHubApp = require('probot/lib/github-app')

beforeEach(() => {
  const models = td.replace('../../lib/models', {
    Installation: {
      getForHost: td.function()
    }
  })

  td.when(models.Installation.getForHost(process.env.ATLASSIAN_URL))
    .thenReturn({
      jiraHost: process.env.ATLASSIAN_URL,
      sharedSecret: process.env.ATLASSIAN_SECRET
    })

  nock('https://api.github.com')
    .post(/\/installations\/[\d\w-]+\/access_tokens/)
    .reply(200, {
      token: 'mocked-token',
      expires_at: '9999-12-31T23:59:59Z'
    })
    .get('/repos/test-repo-owner/test-repo-name/contents/.github/jira.yml')
    .reply(200, {
      content: Buffer.from(`jira: ${process.env.ATLASSIAN_URL}`).toString('base64')
    })

  const configureRobot = require('../../lib/configure-robot')

  global.app = configureRobot(createRobot({
    app: createGitHubApp({
      id: 12257,
      cert: findPrivateKey()
    }),
    cache: cacheManager.caching({
      store: 'memory',
      ttl: 60 * 60 // 1 hour
    })
  }))
})
