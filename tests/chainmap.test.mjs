import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CHAIN_FILENAME,
  CHAIN_LIMIT,
  buildChainModel,
  chainPositions
} from '../js/chainmap.js'

const categories = [
  { id: 'injection', title: 'Injection', color: '#f87171' },
  { id: 'spying', title: 'Spying', color: '#a78bfa' }
]

const apis = [
  {
    name: 'WriteProcessMemory',
    library: 'Kernel32.dll',
    description: 'Writes data into another process. Used by debuggers and injectors.',
    categories: ['injection'],
    mitre: [{ id: 'T1055', name: 'Process Injection' }],
    suspicion: 'high'
  },
  {
    name: 'BitBlt',
    library: 'Gdi32.dll',
    description: 'Copies pixels from one device context to another during screen capture.',
    categories: ['spying'],
    mitre: [{ id: 'T1113', name: 'Screen Capture' }],
    suspicion: 'medium'
  },
  {
    name: 'CreateRemoteThread',
    library: 'Kernel32.dll',
    description: 'Creates a thread in a remote process.',
    categories: ['injection'],
    mitre: [],
    suspicion: 'high'
  }
]

test('chain map keeps the exact input selection order', () => {
  const model = buildChainModel(apis, categories, { scope: 'selection' })
  assert.deepEqual(model.nodes.map((node) => node.name), [
    'WriteProcessMemory',
    'BitBlt',
    'CreateRemoteThread'
  ])
  assert.deepEqual(model.nodes.map((node) => node.step), [1, 2, 3])
  assert.equal(model.nodes[0].library, 'KERNEL32')
  assert.equal(model.nodes[1].categoryColor, '#a78bfa')
  assert.equal(model.nodes[0].mitreId, 'T1055')
  assert.equal(model.nodes[2].mitreId, '')
})

test('chain map wraps cards four per row from left to right', () => {
  const layout = chainPositions(5)
  assert.deepEqual(layout.nodes.map((node) => node.column), [0, 1, 2, 3, 0])
  assert.deepEqual(layout.nodes.map((node) => node.row), [0, 0, 0, 0, 1])
  assert.ok(layout.nodes[4].y > layout.nodes[0].y)
  assert.ok(layout.height > layout.nodes[4].y)
})

test('chain map appends a matched preset to the title', () => {
  const model = buildChainModel(apis, categories, {
    scope: 'selection',
    technique: {
      score: 80,
      preset: {
        title: 'Classic DLL injection',
        mitre: { id: 'T1055.001', name: 'Process Injection: DLL Injection' }
      }
    }
  })
  assert.equal(
    model.title,
    'WinAPI Atlas — API Execution Chain (Classic DLL injection T1055.001)'
  )
  assert.equal(model.presetScore, 80)
  assert.ok(model.subtitle.includes('click order'))
})

test('chain map states the visible-view cap in the subtitle', () => {
  const model = buildChainModel(apis, categories, { scope: 'visible', totalVisible: 120 })
  assert.ok(model.subtitle.includes(`capped at ${CHAIN_LIMIT}`))
  assert.equal(CHAIN_FILENAME, 'winapi-atlas-chain.png')
})
