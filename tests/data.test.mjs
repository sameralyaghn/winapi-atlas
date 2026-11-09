import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCatalog, mitreUrl, nativeCounterpart, normalizeDraftEntry, variantApis } from '../js/data.js'

const categories = [{ id: 'injection', title: 'Injection' }]
const apis = [
  { name: 'VirtualAlloc', library: 'Kernel32.dll', categories: ['injection'], description: 'a' },
  { name: 'VirtualAllocEx', library: 'Kernel32.dll', categories: ['injection'], description: 'b' },
  { name: 'MessageBoxA', library: 'User32.dll', categories: [], description: 'c' },
  { name: 'MessageBoxW', library: 'User32.dll', categories: [], description: 'd' },
  { name: 'NtAllocateVirtualMemory', library: 'Ntdll.dll', categories: ['injection'], description: 'e' },
  { name: 'OpenProcess', library: 'Kernel32.dll', categories: ['injection'], description: 'f' }
]

const catalog = buildCatalog(apis, categories, [])

test('variantApis lists catalogued A/W/Ex siblings', () => {
  assert.deepEqual(variantApis(catalog.byName.get('VirtualAllocEx'), catalog.byName).map((api) => api.name), ['VirtualAlloc'])
  assert.deepEqual(variantApis(catalog.byName.get('MessageBoxW'), catalog.byName).map((api) => api.name), ['MessageBoxA'])
  assert.deepEqual(variantApis(catalog.byName.get('OpenProcess'), catalog.byName), [])
})

test('nativeCounterpart resolves both directions only when catalogued', () => {
  assert.equal(nativeCounterpart('VirtualAllocEx', catalog.byName).name, 'NtAllocateVirtualMemory')
  assert.equal(nativeCounterpart('NtAllocateVirtualMemory', catalog.byName).name, 'VirtualAlloc')
  assert.equal(nativeCounterpart('MessageBoxW', catalog.byName), null)
})

test('normalizeDraftEntry fills defaults for a locally drafted API', () => {
  const entry = normalizeDraftEntry({
    name: 'FooBarW',
    library: 'Kernel32.dll',
    description: 'Does a thing.',
    categories: ['injection', 'not-a-category'],
    suspicion: 'high',
    mitre: [{ id: 'T1055', name: 'Process Injection' }, { id: '' }]
  }, categories)
  assert.deepEqual(entry.categories, ['injection'])
  assert.equal(entry.suspicion, 'high')
  assert.equal(entry.verified, false)
  assert.deepEqual(entry.mitre, [{ id: 'T1055', name: 'Process Injection' }])
  assert.equal(entry.detection.summary, 'Describe what an analyst should look for.')
  assert.equal(entry.docs, 'https://learn.microsoft.com/en-us/search/?terms=FooBarW')
})

test('normalizeDraftEntry rejects incomplete drafts and falls back to one category', () => {
  assert.equal(normalizeDraftEntry({ name: 'Foo' }, categories), null)
  assert.equal(normalizeDraftEntry({ name: 'Foo', library: 'Kernel32.dll' }, categories), null)
  const entry = normalizeDraftEntry({ name: 'Foo', library: 'Kernel32.dll', description: 'x', categories: [] }, categories)
  assert.deepEqual(entry.categories, ['injection'])
  assert.equal(entry.suspicion, 'medium')
  assert.deepEqual(entry.related, [])
})

test('mitreUrl builds technique and sub-technique links', () => {
  assert.equal(mitreUrl('T1055'), 'https://attack.mitre.org/techniques/T1055/')
  assert.equal(mitreUrl('T1055.012'), 'https://attack.mitre.org/techniques/T1055/012/')
  assert.equal(mitreUrl(''), 'https://attack.mitre.org/techniques/')
})
