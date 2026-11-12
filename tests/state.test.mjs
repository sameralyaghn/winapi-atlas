import assert from 'node:assert/strict'
import test from 'node:test'

import {
  activeFilterCount,
  emptyState,
  filterApis,
  groupByCategory,
  hasBoardFilter,
  matchImportNames,
  matchTechniques,
  parseHash,
  parseQuery,
  sanitizeSelection,
  scoreApi,
  scorePreset,
  selectionBreakdown,
  serializeState,
  toggleValue,
  tokenize,
  visibleCategories
} from '../js/state.js'

const apis = [
  {
    name: 'CreateRemoteThread',
    aliases: ['CreateRemoteThreadEx'],
    library: 'Kernel32.dll',
    description: 'Creates a thread that runs in another process.',
    categories: ['injection'],
    mitre: [{ id: 'T1055', name: 'Process Injection' }],
    detection: { summary: 'Remote thread creation.', notes: 'Check start address.' },
    legit_use: 'Debuggers.',
    suspicion: 'high',
    docs_kind: 'direct',
    telemetry_coverage: 'indirect',
    reviewed_at: '2026-01-10',
    sources: [{ label: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createremotethread' }]
  },
  {
    name: 'VirtualAllocEx',
    library: 'Kernel32.dll',
    description: 'Allocates memory inside another process.',
    categories: ['injection', 'memory-management'],
    mitre: [{ id: 'T1055', name: 'Process Injection' }],
    detection: { summary: 'Cross-process allocation.' },
    legit_use: 'Debuggers.',
    suspicion: 'high',
    docs_kind: 'direct',
    telemetry_coverage: 'indirect',
    reviewed_at: null,
    sources: []
  },
  {
    name: 'GetAsyncKeyState',
    library: 'User32.dll',
    description: 'Reads the state of a virtual key.',
    categories: ['spying', 'anti-debugging'],
    mitre: [{ id: 'T1056.001', name: 'Input Capture: Keylogging' }],
    detection: { summary: 'Polling keystrokes.' },
    legit_use: 'Accessibility tools.',
    suspicion: 'high',
    docs_kind: 'related',
    telemetry_coverage: 'none',
    reviewed_at: null,
    sources: []
  },
  {
    name: 'MessageBoxW',
    library: 'User32.dll',
    description: 'Shows a message box.',
    categories: ['helper'],
    mitre: [],
    detection: { summary: 'User interaction.' },
    legit_use: 'Every application.',
    suspicion: 'low',
    docs_kind: 'related',
    telemetry_coverage: 'none',
    reviewed_at: '2026-02-01',
    sources: [{ label: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-messageboxw' }]
  }
]

const categories = [
  { id: 'injection', title: 'Injection' },
  { id: 'spying', title: 'Spying' },
  { id: 'anti-debugging', title: 'Anti-Debugging' },
  { id: 'memory-management', title: 'Memory Management' },
  { id: 'helper', title: 'Helper' }
]

const presets = [
  {
    id: 'classic-injection',
    title: 'Classic injection',
    kind: 'chain',
    mitre: { id: 'T1055.001', name: 'Process Injection: DLL Injection' },
    required: ['VirtualAllocEx', 'CreateRemoteThread'],
    sequence: ['VirtualAllocEx', 'CreateRemoteThread'],
    optional: ['MessageBoxW'],
    defender_note: 'Correlate allocation and remote thread creation.'
  },
  {
    id: 'keylogging',
    title: 'Keylogging',
    kind: 'indicator',
    mitre: { id: 'T1056.001', name: 'Input Capture: Keylogging' },
    required: ['GetAsyncKeyState'],
    optional: [],
    defender_note: 'Watch polling loops.'
  }
]

test('emptyState returns the documented defaults', () => {
  const state = emptyState()
  assert.equal(state.query, '')
  assert.deepEqual(state.selection, [])
  assert.equal(state.mapping, false)
  assert.equal(state.theme, 'dark')
  assert.equal(state.docsKind, '')
  assert.equal(state.telemetry, '')
  assert.equal(state.review, '')
})

test('toggleValue adds then removes a value without mutating', () => {
  const base = ['a']
  const added = toggleValue(base, 'b')
  assert.deepEqual(added, ['a', 'b'])
  assert.deepEqual(base, ['a'])
  assert.deepEqual(toggleValue(added, 'a'), ['b'])
})

test('parseHash reads a short API deep link', () => {
  assert.deepEqual(parseHash('#CreateRemoteThread'), { api: 'CreateRemoteThread' })
  assert.deepEqual(parseHash(''), {})
  assert.deepEqual(parseHash('#'), {})
  assert.deepEqual(parseHash('#not a name!'), {})
})

test('parseHash reads every state parameter', () => {
  const parsed = parseHash('#?q=dll%20injection&cat=injection,spying&lib=Kernel32.dll&sus=high,medium&mit=T1055&docs=direct&tel=indirect&rev=reviewed&sel=A%2CB&mode=1&theme=light&api=CreateRemoteThread')
  assert.equal(parsed.query, 'dll injection')
  assert.deepEqual(parsed.categories, ['injection', 'spying'])
  assert.deepEqual(parsed.libraries, ['Kernel32.dll'])
  assert.deepEqual(parsed.suspicion, ['high', 'medium'])
  assert.equal(parsed.mitre, 'T1055')
  assert.equal(parsed.docsKind, 'direct')
  assert.equal(parsed.telemetry, 'indirect')
  assert.equal(parsed.review, 'reviewed')
  assert.deepEqual(parsed.selection, ['A', 'B'])
  assert.equal(parsed.mapping, true)
  assert.equal(parsed.theme, 'light')
  assert.equal(parsed.api, 'CreateRemoteThread')
})

test('parseHash drops invalid suspicion values', () => {
  assert.deepEqual(parseHash('#?sus=critical,high').suspicion, ['high'])
  assert.deepEqual(parseHash('#?docs=first-party&tel=native&rev=stale'), {})
})

test('serializeState round-trips through parseHash', () => {
  const state = {
    ...emptyState(),
    query: 'remote thread',
    categories: ['injection'],
    libraries: ['Kernel32.dll'],
    suspicion: ['high'],
    mitre: 'T1055',
    docsKind: 'direct',
    telemetry: 'indirect',
    review: 'reviewed',
    selection: ['CreateRemoteThread', 'VirtualAllocEx'],
    mapping: true,
    theme: 'light',
    api: 'CreateRemoteThread'
  }
  const hash = serializeState(state)
  const parsed = parseHash(hash)
  assert.equal(parsed.query, state.query)
  assert.deepEqual(parsed.categories, state.categories)
  assert.deepEqual(parsed.libraries, state.libraries)
  assert.deepEqual(parsed.suspicion, state.suspicion)
  assert.equal(parsed.mitre, state.mitre)
  assert.equal(parsed.docsKind, state.docsKind)
  assert.equal(parsed.telemetry, state.telemetry)
  assert.equal(parsed.review, state.review)
  assert.deepEqual(parsed.selection, state.selection)
  assert.equal(parsed.mapping, true)
  assert.equal(parsed.theme, 'light')
  assert.equal(parsed.api, state.api)
})

test('serializeState keeps a detail-only link short', () => {
  assert.equal(serializeState({ ...emptyState(), api: 'CreateRemoteThread' }), '#CreateRemoteThread')
  assert.equal(serializeState(emptyState()), '')
  assert.equal(serializeState({ ...emptyState(), theme: 'light' }), '#?theme=light')
})

test('serializeState escapes API names in list parameters', () => {
  const hash = serializeState({ ...emptyState(), selection: ['A B', 'C,D'] })
  assert.deepEqual(parseHash(hash).selection, ['A B', 'C,D'])
})

test('scoreApi matches names, MITRE ids and aliases', () => {
  assert.ok(scoreApi(apis[0], tokenize('createremotethread')) > scoreApi(apis[0], tokenize('thread')))
  assert.equal(scoreApi(apis[0], tokenize('T1055')), 20)
  assert.equal(scoreApi(apis[0], tokenize('CreateRemoteThreadEx')), 40)
  assert.equal(scoreApi(apis[3], tokenize('nonexistenttoken')), null)
})

test('scoreApi supports an ordered fuzzy match on the name', () => {
  assert.equal(scoreApi(apis[0], tokenize('crt')), 10)
})

test('filterApis combines library, suspicion, MITRE and query filters', () => {
  const state = {
    ...emptyState(),
    libraries: ['Kernel32.dll'],
    suspicion: ['high'],
    mitre: 'T1055',
    query: 'allocate'
  }
  const result = filterApis(apis, state)
  assert.deepEqual(result.map((api) => api.name), ['VirtualAllocEx'])
})

test('filterApis sorts query results by relevance', () => {
  const result = filterApis(apis, { ...emptyState(), query: 'virtual' })
  assert.equal(result[0].name, 'VirtualAllocEx')
})

test('filterApis applies documentation, telemetry and review facets', () => {
  assert.deepEqual(
    filterApis(apis, { ...emptyState(), docsKind: 'direct', telemetry: 'indirect' }).map((api) => api.name),
    ['CreateRemoteThread', 'VirtualAllocEx']
  )
  assert.deepEqual(
    filterApis(apis, { ...emptyState(), review: 'reviewed' }).map((api) => api.name),
    ['CreateRemoteThread', 'MessageBoxW']
  )
  assert.deepEqual(
    filterApis(apis, { ...emptyState(), docsKind: 'related', telemetry: 'none', review: 'unreviewed' }).map((api) => api.name),
    ['GetAsyncKeyState']
  )
})

test('filterApis restricts the board to an import filter and restores it when cleared', () => {
  const imported = { ...emptyState(), importFilter: true, selection: ['MessageBoxW', 'CreateRemoteThread'] }
  assert.deepEqual(filterApis(apis, imported).map((api) => api.name), ['CreateRemoteThread', 'MessageBoxW'])
  assert.deepEqual(filterApis(apis, { ...imported, importFilter: false }).map((api) => api.name).length, apis.length)
})

test('groupByCategory puts an API in every assigned column', () => {
  const groups = groupByCategory(apis, categories)
  assert.deepEqual(groups.get('injection').map((api) => api.name), ['CreateRemoteThread', 'VirtualAllocEx'])
  assert.deepEqual(groups.get('memory-management').map((api) => api.name), ['VirtualAllocEx'])
  assert.deepEqual(groups.get('helper').map((api) => api.name), ['MessageBoxW'])
  assert.equal(groups.get('spying').length, 1)
})

test('visibleCategories respects the category filter', () => {
  assert.equal(visibleCategories(categories, emptyState()).length, categories.length)
  assert.deepEqual(
    visibleCategories(categories, { ...emptyState(), categories: ['spying'] }).map((category) => category.id),
    ['spying']
  )
})

test('visibleCategories hides zero-result columns only while a filter is active', () => {
  const filteredState = { ...emptyState(), query: 'messagebox' }
  const groups = groupByCategory(filterApis(apis, filteredState), categories)
  assert.deepEqual(
    visibleCategories(categories, filteredState, groups).map((category) => category.id),
    ['helper']
  )
  assert.deepEqual(
    visibleCategories(categories, { ...emptyState(), query: 'no such api' }, groupByCategory([], categories)),
    []
  )
  assert.equal(visibleCategories(categories, emptyState(), groups).length, categories.length)
})

test('hasBoardFilter recognises Paste Imports and an empty selection restores the board', () => {
  assert.equal(hasBoardFilter(emptyState()), false)
  assert.equal(hasBoardFilter({ ...emptyState(), importFilter: true, selection: ['MessageBoxW'] }), true)
  assert.equal(hasBoardFilter({ ...emptyState(), importFilter: true, selection: [] }), false)
  assert.equal(hasBoardFilter({ ...emptyState(), telemetry: 'none' }), true)
  assert.equal(hasBoardFilter({ ...emptyState(), review: 'unreviewed' }), true)
})

test('scorePreset marks only the intended required order as a complete chain', () => {
  const correct = scorePreset(presets[0], ['VirtualAllocEx', 'CreateRemoteThread'])
  assert.equal(correct.complete, true)
  assert.equal(correct.ordered, true)
  assert.equal(correct.completeOrdered, true)
  assert.deepEqual(correct.outOfOrder, [])
  assert.equal(correct.score, 80)

  const reverse = scorePreset(presets[0], ['CreateRemoteThread', 'VirtualAllocEx'])
  assert.equal(reverse.complete, true)
  assert.equal(reverse.ordered, false)
  assert.equal(reverse.completeOrdered, false)
  assert.deepEqual(reverse.outOfOrder, ['VirtualAllocEx'])
  assert.equal(reverse.score, 60)
})

test('scorePreset does not complete a multi-required chain from one API', () => {
  const partial = scorePreset(presets[0], ['VirtualAllocEx'])
  assert.equal(partial.score, 30)
  assert.equal(partial.complete, false)
  assert.equal(partial.completeOrdered, false)
  assert.equal(partial.orderApplicable, false)
  assert.deepEqual(partial.missingRequired, ['CreateRemoteThread'])
})

test('optional APIs do not disturb the required sequence', () => {
  const scored = scorePreset(presets[0], ['MessageBoxW', 'VirtualAllocEx', 'CreateRemoteThread'])
  assert.equal(scored.completeOrdered, true)
  assert.equal(scored.ordered, true)
  assert.deepEqual(scored.outOfOrder, [])
  assert.equal(scored.score, 100)
})

test('one-required indicator presets never claim a completed chain', () => {
  const indicator = scorePreset(presets[1], ['GetAsyncKeyState'])
  assert.equal(indicator.kind, 'indicator')
  assert.equal(indicator.complete, true)
  assert.equal(indicator.completeOrdered, false)
  assert.equal(indicator.orderApplicable, false)
  assert.equal(indicator.score, 80)

  const full = scorePreset(presets[0], ['VirtualAllocEx', 'CreateRemoteThread', 'MessageBoxW'])
  assert.equal(full.score, 100)
  assert.equal(full.completeOrdered, true)
})

test('matchTechniques filters weak or unrelated matches and sorts by score', () => {
  const matches = matchTechniques(['VirtualAllocEx', 'CreateRemoteThread', 'GetAsyncKeyState'], presets)
  assert.equal(matches.length, 2)
  assert.equal(matches[0].preset.id, 'classic-injection')
  assert.equal(matches[0].score, 80)
  assert.equal(matches[0].completeOrdered, true)
  assert.ok(matches.every((match) => match.matchedRequired.length > 0))
  assert.deepEqual(matchTechniques([], presets), [])
})

test('selectionBreakdown counts multi-category APIs in each category', () => {
  const breakdown = selectionBreakdown(['VirtualAllocEx', 'GetAsyncKeyState'], apis, categories)
  assert.equal(breakdown.total, 2)
  assert.deepEqual(breakdown.categories, [
    { id: 'injection', title: 'Injection', count: 1 },
    { id: 'spying', title: 'Spying', count: 1 },
    { id: 'anti-debugging', title: 'Anti-Debugging', count: 1 },
    { id: 'memory-management', title: 'Memory Management', count: 1 }
  ])
})

test('sanitizeSelection removes unknown and duplicate names', () => {
  const byName = new Map(apis.map((api) => [api.name, api]))
  assert.deepEqual(
    sanitizeSelection(['VirtualAllocEx', 'Nope', 'VirtualAllocEx', 'MessageBoxW'], byName),
    ['VirtualAllocEx', 'MessageBoxW']
  )
})

test('activeFilterCount counts each active facet', () => {
  assert.equal(activeFilterCount(emptyState()), 0)
  assert.equal(activeFilterCount({
    ...emptyState(),
    query: 'x',
    categories: ['injection'],
    libraries: ['Kernel32.dll'],
    suspicion: ['high'],
    mitre: 'T1055',
    docsKind: 'direct',
    telemetry: 'indirect',
    review: 'reviewed'
  }), 8)
  assert.equal(activeFilterCount({ ...emptyState(), importFilter: true, selection: ['MessageBoxW'] }), 1)
})

test('matchImportNames finds decorated, variant and __imp_ imports', () => {
  const text = [
    'Dump of file sample.exe',
    '  KERNEL32.dll',
    '    CreateRemoteThread',
    '    VirtualAllocEx',
    '    __imp_MessageBoxW',
    '    _MessageBoxA@16',
    '    GetAsyncKeyState@0',
    '    NotAWindowsApi'
  ].join('\n')
  assert.deepEqual(matchImportNames(text, apis), [
    'CreateRemoteThread',
    'VirtualAllocEx',
    'MessageBoxW',
    'GetAsyncKeyState'
  ])
  assert.deepEqual(matchImportNames('', apis), [])
  assert.deepEqual(matchImportNames('nothing relevant here', apis), [])
})

test('matchImportNames is case-insensitive and de-duplicates', () => {
  const names = matchImportNames('createremotethread CREATEREMOTETHREAD CreateRemoteThreadEx', apis)
  assert.deepEqual(names, ['CreateRemoteThread'])
})

test('parseQuery reads api, cat and q landing parameters', () => {
  assert.deepEqual(parseQuery('?api=VirtualAllocEx'), { api: 'VirtualAllocEx' })
  assert.deepEqual(parseQuery('?cat=injection,spying&q=amsi'), {
    categories: ['injection', 'spying'],
    query: 'amsi'
  })
  assert.deepEqual(parseQuery(''), {})
})
