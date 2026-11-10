import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGithubIssueUrl } from '../js/ui.js'

test('buildGithubIssueUrl encodes the correction title and body', () => {
  const title = 'Data Correction: CreateRemoteThread'
  const body = '## Data correction\n\n```json\n{"name":"CreateRemoteThread"}\n```'
  const url = buildGithubIssueUrl(title, body)
  const parsed = new URL(url)

  assert.equal(`${parsed.origin}${parsed.pathname}`, 'https://github.com/sameralyaghn/winapi-atlas/issues/new')
  assert.equal(parsed.searchParams.get('title'), title)
  assert.equal(parsed.searchParams.get('body'), body)
  assert.ok(url.includes('title=Data%20Correction%3A%20CreateRemoteThread'))
  assert.ok(url.includes('body=%23%23%20Data%20correction'))
})
