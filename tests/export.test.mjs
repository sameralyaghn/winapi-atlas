import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCsv,
  buildJson,
  buildMarkdown,
  buildSigmaHints,
  csvCell,
  exportFilename
} from '../js/export.js'

const api = {
  name: 'CreateRemoteThread',
  aliases: ['CreateRemoteThreadEx'],
  library: 'Kernel32.dll',
  description: 'Creates a thread that runs in another process, "remotely".',
  categories: ['injection'],
  mitre: [{ id: 'T1055', name: 'Process Injection' }],
  docs: 'https://learn.microsoft.com/en-us/search/?terms=CreateRemoteThread',
  detection: {
    summary: 'Remote threads are a strong injection indicator.',
    sysmon_events: [8, 10],
    etw_providers: ['Microsoft-Windows-Kernel-Process'],
    notes: 'Check module ownership of the start address.'
  },
  legit_use: 'Debuggers | installers',
  related: ['OpenProcess', 'WriteProcessMemory'],
  suspicion: 'high',
  verified: true
}

const second = {
  name: 'MessageBoxW',
  library: 'User32.dll',
  description: 'Shows a message box.\nSecond line.',
  categories: ['helper'],
  mitre: [],
  docs: 'https://learn.microsoft.com/en-us/search/?terms=MessageBoxW',
  detection: { summary: 'User interaction.' },
  legit_use: 'Every application',
  related: [],
  suspicion: 'low',
  verified: false
}

const categories = [{ id: 'injection', title: 'Injection' }, { id: 'helper', title: 'Helper' }]

test('csvCell quotes commas, quotes and newlines', () => {
  assert.equal(csvCell('plain'), 'plain')
  assert.equal(csvCell('a,b'), '"a,b"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"')
  assert.equal(csvCell(null), '')
})

test('buildCsv writes a header, escapes fields and keeps CRLF endings', () => {
  const csv = buildCsv([second, api])
  const lines = csv.split('\r\n')
  assert.equal(lines[0].split(',')[0], 'name')
  assert.ok(lines[0].includes('sysmon_events'))
  assert.ok(lines[0].includes('etw_providers'))
  assert.ok(csv.includes('"Creates a thread that runs in another process, ""remotely""."'))
  assert.ok(csv.includes('CreateRemoteThread,CreateRemoteThreadEx,Kernel32.dll,high'))
  assert.ok(csv.endsWith('\r\n'))
  // Alphabetical order: CreateRemoteThread before MessageBoxW.
  assert.ok(csv.indexOf('CreateRemoteThread') < csv.indexOf('MessageBoxW'))
})

test('buildJson returns a versioned envelope sorted by name', () => {
  const json = JSON.parse(buildJson([second, api], { generatedAt: '2026-01-01T00:00:00.000Z', scope: 'selection' }))
  assert.equal(json.format, 'winapi-atlas')
  assert.equal(json.count, 2)
  assert.equal(json.scope, 'selection')
  assert.equal(json.generated_at, '2026-01-01T00:00:00.000Z')
  assert.deepEqual(json.apis.map((entry) => entry.name), ['CreateRemoteThread', 'MessageBoxW'])
  assert.equal(json.apis[0].detection.sysmon_events[0], 8)
})

test('buildMarkdown produces a table and escapes pipes and newlines', () => {
  const md = buildMarkdown([api, second])
  const lines = md.trim().split('\n')
  assert.equal(lines[0], '| API | Library | Suspicion | Categories | MITRE | Description |')
  assert.ok(md.includes('`CreateRemoteThread`'))
  assert.ok(md.includes('T1055 Process Injection'))
  assert.ok(md.includes('Second line.'))
  assert.ok(!md.includes('Shows a message box.\nSecond line.'))

  const piped = buildMarkdown([{ ...second, name: 'PipedApi', description: 'a | b' }])
  assert.ok(piped.includes('a \\| b'))
})

test('buildSigmaHints includes technique chains, telemetry and category groups', () => {
  const techniques = [{
    preset: {
      id: 'classic',
      title: 'Classic DLL injection',
      mitre: { id: 'T1055.001', name: 'Process Injection: DLL Injection' },
      defender_note: 'Correlate allocation and remote thread creation.'
    },
    score: 92,
    matchedRequired: ['CreateRemoteThread'],
    matchedOptional: [],
    missingRequired: ['VirtualAllocEx']
  }]
  const sigma = buildSigmaHints([api], techniques, categories, { generatedAt: '2026-01-01T00:00:00.000Z', selection: true })
  assert.ok(sigma.startsWith('# WinAPI Atlas - hunt hints'))
  assert.ok(sigma.includes('title: Suspicious Windows API usage'))
  assert.ok(sigma.includes('name: Classic DLL injection'))
  assert.ok(sigma.includes('technique: T1055.001 Process Injection: DLL Injection'))
  assert.ok(sigma.includes('match: 92%'))
  assert.ok(sigma.includes('sysmon: [8, 10]'))
  assert.ok(sigma.includes('etw: [Microsoft-Windows-Kernel-Process]'))
  assert.ok(sigma.includes('apis: [CreateRemoteThread]'))
  assert.ok(sigma.includes('missing_required: [VirtualAllocEx]'))
  assert.ok(sigma.includes('category: Injection'))
  assert.ok(sigma.includes('falsepositives:'))
  assert.ok(sigma.includes('Scope: selection (1 APIs)'))
})

test('buildSigmaHints with an empty selection still lists hunt targets', () => {
  const sigma = buildSigmaHints([api, second], [], categories, { selection: false })
  assert.ok(sigma.includes('# Select APIs in the app'))
  assert.ok(sigma.includes('api: CreateRemoteThread'))
  // Low-suspicion entries are excluded from hunt_for.
  assert.ok(!sigma.includes('api: MessageBoxW'))
  assert.ok(sigma.includes('Scope: catalog (2 APIs)'))
})

test('exportFilename uses a dated, scoped name', () => {
  const date = new Date('2026-03-04T12:00:00.000Z')
  assert.equal(exportFilename('csv', 'selection', date), 'winapi-atlas-selection-2026-03-04.csv')
  assert.equal(exportFilename('yml', 'catalog', date), 'winapi-atlas-catalog-2026-03-04.yml')
})
