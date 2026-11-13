#!/usr/bin/env node
/**
 * Verifies the generated static SEO architecture after `npm run build:seo`.
 * Runs without dependencies or a browser.
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

import {
  DEFAULT_SITE_URL,
  canonicalApiUrl,
  canonicalCategoryUrl,
  rootCanonicalUrl
} from '../js/seo.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
// The pre-SEO app payload was about 123 KB gzipped. Keep routing and metadata
// work from materially growing the initial download.
const APP_GZIP_BUDGET = 140 * 1024
const APP_FILES = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/data.js',
  'js/state.js',
  'js/ui.js',
  'js/export.js',
  'js/chainmap.js',
  'js/schema.js',
  'js/seo.js',
  'data/apis.json',
  'data/categories.json',
  'data/presets.json'
]

function fail(message) {
  throw new Error(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))
  return match ? match[1] : ''
}

function extractMeta(html, name) {
  const tag = html.match(new RegExp(`<meta\\b[^>]*name="${name}"[^>]*>`, 'i'))
  return tag ? attr(tag[0], 'content') : ''
}

function extractProperty(html, property) {
  const tag = html.match(new RegExp(`<meta\\b[^>]*property="${property}"[^>]*>`, 'i'))
  return tag ? attr(tag[0], 'content') : ''
}

function inspectPage(html, label) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ''
  const canonicalTag = html.match(/<link\b[^>]*rel="canonical"[^>]*>/i)
  const canonical = canonicalTag ? attr(canonicalTag[0], 'href') : ''
  const description = extractMeta(html, 'description')
  const h1s = html.match(/<h1\b[^>]*>/gi) || []
  return {
    label,
    title,
    canonical,
    description,
    h1Count: h1s.length,
    ogTitle: extractProperty(html, 'og:title'),
    ogDescription: extractProperty(html, 'og:description'),
    ogUrl: extractProperty(html, 'og:url')
  }
}

function uniqueValues(pages, key) {
  const seen = new Map()
  for (const page of pages) {
    const value = page[key]
    assert(value, `${page.label}: missing ${key}`)
    if (seen.has(value)) fail(`${page.label}: duplicate ${key} shared with ${seen.get(value)}`)
    seen.set(value, page.label)
  }
}

async function main() {
  assert(await exists(dist), 'dist/ is missing — run npm run build:seo first')
  const [apis, categories] = await Promise.all([
    readFile(join(root, 'data', 'apis.json'), 'utf8').then(JSON.parse),
    readFile(join(root, 'data', 'categories.json'), 'utf8').then(JSON.parse)
  ])
  const apiFiles = (await readdir(join(dist, 'api'))).filter((file) => file.endsWith('.html'))
  const categoryFiles = (await readdir(join(dist, 'category'))).filter((file) => file.endsWith('.html'))
  assert(apiFiles.length === apis.length, `Expected ${apis.length} API pages, found ${apiFiles.length}`)
  assert(categoryFiles.length === categories.length, `Expected ${categories.length} category pages, found ${categoryFiles.length}`)

  const pages = []
  const rootIndex = await readFile(join(dist, 'index.html'), 'utf8')
  const rootPage = inspectPage(rootIndex, 'index.html')
  assert(rootPage.canonical === rootCanonicalUrl(siteUrl), 'Root canonical is not the deployment root')
  assert(!/&\s*$/.test(rootPage.title), 'Root title ends with a dangling ampersand')
  assert(rootPage.ogTitle && rootPage.ogDescription, 'Root Open Graph metadata is incomplete')
  assert(rootIndex.includes('src="js/app.js"'), 'Root app script is missing')
  pages.push(rootPage)

  const expected = new Map()
  expected.set(rootCanonicalUrl(siteUrl), 'index.html')
  const categoryById = new Map(categories.map((category) => [category.id, category]))

  for (const category of categories) {
    const file = `${category.id}.html`
    const html = await readFile(join(dist, 'category', file), 'utf8')
    const page = inspectPage(html, `category/${file}`)
    const expectedCanonical = canonicalCategoryUrl(siteUrl, category.id)
    assert(page.canonical === expectedCanonical, `category/${file}: wrong canonical ${page.canonical}`)
    assert(page.h1Count === 1, `category/${file}: expected exactly one H1, found ${page.h1Count}`)
    assert(/class="api-list"/.test(html), `category/${file}: API list is missing`)
    assert(/Detection|detection/.test(html), `category/${file}: detection context is missing`)
    assert(!/<script\b(?![^>]*application\/ld\+json)[^>]*>/i.test(html), `category/${file}: executable JavaScript found`)
    assert(page.ogTitle && page.ogDescription && page.ogUrl === expectedCanonical, `category/${file}: incomplete OG metadata`)
    expected.set(expectedCanonical, `category/${file}`)
    pages.push(page)
  }

  for (const api of apis) {
    const file = `${api.name}.html`
    const html = await readFile(join(dist, 'api', file), 'utf8')
    const page = inspectPage(html, `api/${file}`)
    const expectedCanonical = canonicalApiUrl(siteUrl, api.name)
    assert(page.canonical === expectedCanonical, `api/${file}: wrong canonical ${page.canonical}`)
    assert(page.h1Count === 1, `api/${file}: expected exactly one H1, found ${page.h1Count}`)
    assert(html.includes(`<h1>${api.name.replaceAll('&', '&amp;')}</h1>`), `api/${file}: H1 does not contain the API name`)
    assert(html.includes('Detection summary'), `api/${file}: detection summary is missing`)
    assert(html.includes('Sources and documentation'), `api/${file}: sources are missing`)
    assert(html.includes('Legitimate use'), `api/${file}: legitimate use is missing`)
    assert(html.includes(`/#${encodeURIComponent(api.name)}`), `api/${file}: interactive app link is missing`)
    assert(!/<script\b(?![^>]*application\/ld\+json)[^>]*>/i.test(html), `api/${file}: executable JavaScript found`)
    assert(page.ogTitle && page.ogDescription && page.ogUrl === expectedCanonical, `api/${file}: incomplete OG metadata`)
    expected.set(expectedCanonical, `api/${file}`)
    pages.push(page)
  }

  uniqueValues(pages, 'title')
  uniqueValues(pages, 'description')
  uniqueValues(pages, 'canonical')

  for (const page of pages) {
    assert(!page.canonical.includes('?'), `${page.label}: canonical contains a query string`)
    assert(!page.canonical.includes('?api=') && !page.canonical.includes('?cat='), `${page.label}: legacy query canonical`)
  }

  const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8')
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1])
  assert(locs.length === expected.size, `Sitemap has ${locs.length} URLs; expected ${expected.size}`)
  assert(lastmods.length === locs.length, 'Every sitemap URL must have a lastmod')
  assert(new Set(locs).size === locs.length, 'Sitemap contains duplicate URLs')
  assert(locs.every((loc) => !loc.includes('?')), 'Sitemap contains query-string URLs')
  for (const loc of locs) {
    assert(expected.has(loc), `Sitemap URL has no generated page: ${loc}`)
  }
  for (const loc of expected.keys()) {
    assert(locs.includes(loc), `Generated page is missing from sitemap: ${loc}`)
  }
  assert(lastmods.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)), 'Sitemap has an invalid lastmod value')
  assert(locs.every((loc) => !loc.includes('?api=') && !loc.includes('?cat=')), 'Sitemap still advertises legacy query URLs')

  const robots = await readFile(join(dist, 'robots.txt'), 'utf8')
  assert(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), 'robots.txt does not point at the generated sitemap')

  let gzipTotal = 0
  for (const file of APP_FILES) {
    gzipTotal += gzipSync(await readFile(join(dist, file))).length
  }
  assert(
    gzipTotal <= APP_GZIP_BUDGET,
    `App gzip payload ${gzipTotal} bytes exceeds the ${APP_GZIP_BUDGET}-byte budget`
  )

  // API names must not create duplicate category-like canonical pages.
  assert(new Set(apis.map((api) => api.name)).size === apis.length, 'Duplicate API names would create duplicate canonical pages')
  assert(categoryById.size === categories.length, 'Duplicate category ids would create duplicate canonical pages')

  console.log(`SEO checks passed: ${pages.length} pages, ${locs.length} sitemap URLs`)
  console.log(`  app gzip payload: ${gzipTotal} / ${APP_GZIP_BUDGET} bytes`)
  console.log(`  generated API pages: ${apiFiles.length}`)
  console.log(`  generated category pages: ${categoryFiles.length}`)
}

main().catch((error) => {
  console.error(`SEO check failed: ${error.message}`)
  process.exitCode = 1
})
