import assert from 'node:assert/strict'
import test from 'node:test'

import {
  apiMetaDescription,
  apiPageTitle,
  canonicalApiPath,
  canonicalApiUrl,
  canonicalCategoryPath,
  categoryMetaDescription,
  categoryPageTitle,
  legacyRedirectTarget,
  rootCanonicalUrl
} from '../js/seo.js'
import { buildApiPage, buildCategoryPage, buildSitemap } from '../scripts/seo-pages.mjs'

const siteUrl = 'https://winapi-atlas.vercel.app'
const generatedAt = '2026-11-12'
const categories = [
  {
    id: 'injection',
    title: 'Injection',
    description: 'Placing code in another process.',
    explanation: 'Injection APIs place code or data inside another process.',
    color: '#f87171'
  },
  {
    id: 'memory-management',
    title: 'Memory Management',
    description: 'Allocating and protecting memory.',
    explanation: 'Memory APIs allocate, protect and release virtual memory.',
    color: '#a78bfa'
  }
]
const apis = [
  {
    name: 'CreateRemoteThread',
    library: 'Kernel32.dll',
    description: 'Creates a thread that runs in another process.',
    categories: ['injection'],
    mitre: [{ id: 'T1055', name: 'Process Injection' }],
    docs: 'https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createremotethread',
    docs_kind: 'direct',
    detection: {
      summary: 'Remote thread creation observed through process/thread telemetry.',
      sysmon_events: [8],
      etw_providers: ['Microsoft-Windows-Kernel-Process'],
      notes: 'Correlate with cross-process writes.'
    },
    legit_use: 'Debuggers and some accessibility tools.',
    related: ['VirtualAllocEx'],
    suspicion: 'high',
    reviewed_at: '2026-01-10',
    sources: [{ label: 'Microsoft Learn', url: 'https://learn.microsoft.com/' }]
  },
  {
    name: 'VirtualAllocEx',
    library: 'Kernel32.dll',
    description: 'Allocates memory inside another process.',
    categories: ['injection', 'memory-management'],
    mitre: [{ id: 'T1055', name: 'Process Injection' }],
    docs: 'https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualallocex',
    docs_kind: 'direct',
    detection: { summary: 'Cross-process allocation.', sysmon_events: [], etw_providers: [] },
    legit_use: 'Debuggers.',
    related: ['CreateRemoteThread'],
    suspicion: 'high',
    reviewed_at: null,
    sources: []
  }
]
const byName = new Map(apis.map((api) => [api.name, api]))

test('canonical helpers produce prefix-free paths and absolute URLs', () => {
  assert.equal(canonicalApiPath('CreateRemoteThread'), '/api/CreateRemoteThread')
  assert.equal(canonicalCategoryPath('memory-management'), '/category/memory-management')
  assert.equal(canonicalApiUrl(siteUrl, 'CreateRemoteThread'), `${siteUrl}/api/CreateRemoteThread`)
  assert.equal(rootCanonicalUrl(`${siteUrl}/`), `${siteUrl}/`)
})

test('legacy api and category query links map to canonical paths', () => {
  assert.equal(legacyRedirectTarget('?api=CreateRemoteThread'), '/api/CreateRemoteThread')
  assert.equal(legacyRedirectTarget('?cat=injection,memory-management'), '/category/injection')
  assert.equal(legacyRedirectTarget('?q=thread'), null)
  assert.equal(legacyRedirectTarget(''), null)
})

test('generated metadata is derived from each record', () => {
  const api = apis[0]
  const category = categories[0]
  assert.equal(apiPageTitle(api), 'CreateRemoteThread — Windows API Detection & Telemetry | WinAPI Atlas')
  assert.equal(categoryPageTitle(category), 'Injection — Windows API Detection & Telemetry | WinAPI Atlas')
  assert.match(apiMetaDescription(api), /CreateRemoteThread/)
  assert.match(apiMetaDescription(api), /Kernel32\.dll/)
  assert.match(categoryMetaDescription(category, 1), /Injection/)
  assert.notEqual(apiMetaDescription(apis[0]), apiMetaDescription(apis[1]))
})

test('API pages are crawlable and contain one H1 and the app link', () => {
  const html = buildApiPage(apis[0], { siteUrl, generatedAt, categories, byName })
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.match(html, /<title>CreateRemoteThread — Windows API Detection &amp; Telemetry \| WinAPI Atlas<\/title>/)
  assert.match(html, /rel="canonical" href="https:\/\/winapi-atlas\.vercel\.app\/api\/CreateRemoteThread"/)
  assert.match(html, /Detection summary/)
  assert.match(html, /Sources and documentation/)
  assert.match(html, /Legitimate use/)
  assert.match(html, /href="\/#CreateRemoteThread"/)
  assert.doesNotMatch(html, /<script(?![^>]*application\/ld\+json)/)
})

test('category pages contain one H1 and a crawlable API list', () => {
  const html = buildCategoryPage(categories[0], [apis[0]], {
    siteUrl,
    generatedAt,
    categories
  })
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.match(html, /<title>Injection — Windows API Detection &amp; Telemetry \| WinAPI Atlas<\/title>/)
  assert.match(html, /href="\/api\/CreateRemoteThread"/)
  assert.match(html, /class="api-list"/)
  assert.doesNotMatch(html, /<script(?![^>]*application\/ld\+json)/)
})

test('sitemap contains only unique canonical paths and real lastmod values', () => {
  const xml = buildSitemap({ apis, categories, siteUrl, generatedAt })
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1])
  assert.equal(locs.length, 1 + apis.length + categories.length)
  assert.equal(new Set(locs).size, locs.length)
  assert.ok(locs.every((loc) => !loc.includes('?')))
  assert.ok(locs.includes(`${siteUrl}/api/CreateRemoteThread`))
  assert.ok(locs.includes(`${siteUrl}/category/injection`))
  assert.ok(lastmods.includes('2026-01-10'))
  assert.ok(lastmods.includes(generatedAt))
})
