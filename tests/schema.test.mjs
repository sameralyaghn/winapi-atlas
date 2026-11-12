import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyDocsKind,
  classifyTelemetryCoverage,
  isReviewed
} from '../js/schema.js'

test('classifyDocsKind distinguishes direct, related and missing links', () => {
  assert.equal(
    classifyDocsKind(
      'CreateRemoteThread',
      'https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createremotethread'
    ),
    'direct'
  )
  assert.equal(
    classifyDocsKind(
      'NtCreateThreadEx',
      'https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createremotethreadex'
    ),
    'related'
  )
  assert.equal(classifyDocsKind('Foo', ''), 'none')
  assert.equal(classifyDocsKind('Foo', 'not a URL'), 'none')
})

test('classifyTelemetryCoverage requires evidence for indirect and none', () => {
  assert.equal(
    classifyTelemetryCoverage({ sysmon_events: [8], etw_providers: [] }),
    'indirect'
  )
  assert.equal(
    classifyTelemetryCoverage({
      summary: 'The API is not logged directly by Sysmon.',
      notes: 'Use imports and hooks.'
    }),
    'none'
  )
  assert.equal(classifyTelemetryCoverage({ summary: 'No mapping recorded.' }), 'unknown')
  assert.equal(classifyTelemetryCoverage({}), 'unknown')
})

test('isReviewed only accepts a recorded review date', () => {
  assert.equal(isReviewed({ reviewed_at: null }), false)
  assert.equal(isReviewed({ reviewed_at: '' }), false)
  assert.equal(isReviewed({ reviewed_at: '2026-01-10' }), true)
  assert.equal(isReviewed({}), false)
})
