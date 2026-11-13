#!/usr/bin/env node
/**
 * Builds the deployable static site:
 *   - the existing vanilla app at /
 *   - one crawlable page per API at /api/<ApiName>
 *   - one crawlable page per category at /category/<id>
 *   - a generated sitemap and robots file
 *
 * No dependencies, no framework, and no client JavaScript on detail pages.
 *
 * Usage: node scripts/build-seo.mjs
 * Optional environment: SITE_URL, SEO_GENERATED_AT (YYYY-MM-DD)
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_SITE_URL, isDate, normalizeSiteUrl } from '../js/seo.js'
import { buildApiPage, buildCategoryPage, buildRobots, buildSitemap } from './seo-pages.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'dist')

function siteUrlFromEnvironment() {
  const raw = process.env.SITE_URL || DEFAULT_SITE_URL
  const normalized = normalizeSiteUrl(raw)
  try {
    const parsed = new URL(normalized)
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('SITE_URL must use http or https')
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('SITE_URL must be an origin without a path')
    }
  } catch {
    throw new Error(`Invalid SITE_URL: ${raw}`)
  }
  return normalized
}

function generatedAtFromEnvironment() {
  const value = process.env.SEO_GENERATED_AT
  if (value && !isDate(value)) throw new Error('SEO_GENERATED_AT must use YYYY-MM-DD')
  return value || new Date().toISOString().slice(0, 10)
}

async function copyAppAssets(siteUrl) {
  for (const directory of ['css', 'js', 'data', 'screenshots']) {
    await cp(join(root, directory), join(outDir, directory), { recursive: true })
  }
  for (const file of ['favicon.svg', 'LICENSE']) {
    await cp(join(root, file), join(outDir, file))
  }

  // Keep the root app's absolute metadata in sync with the deployment origin.
  const index = await readFile(join(root, 'index.html'), 'utf8')
  const rewritten = index.replaceAll(DEFAULT_SITE_URL, siteUrl)
  await writeFile(join(outDir, 'index.html'), rewritten)
}

async function main() {
  const siteUrl = siteUrlFromEnvironment()
  const generatedAt = generatedAtFromEnvironment()
  const [apis, categories] = await Promise.all([
    readFile(join(root, 'data', 'apis.json'), 'utf8').then(JSON.parse),
    readFile(join(root, 'data', 'categories.json'), 'utf8').then(JSON.parse)
  ])

  const byName = new Map(apis.map((api) => [api.name, api]))
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const categoryApis = new Map(categories.map((category) => [category.id, []]))

  for (const api of apis) {
    for (const categoryId of api.categories) {
      if (!categoryApis.has(categoryId)) {
        throw new Error(`API ${api.name} references unknown category ${categoryId}`)
      }
      categoryApis.get(categoryId).push(api)
    }
  }

  await rm(outDir, { recursive: true, force: true })
  await mkdir(join(outDir, 'api'), { recursive: true })
  await mkdir(join(outDir, 'category'), { recursive: true })
  await copyAppAssets(siteUrl)

  for (const api of apis) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(api.name)) {
      throw new Error(`API name cannot be used as a canonical path: ${api.name}`)
    }
    const html = buildApiPage(api, { siteUrl, generatedAt, categories, byName })
    await writeFile(join(outDir, 'api', `${api.name}.html`), html)
  }

  for (const category of categories) {
    if (!/^[a-z0-9-]+$/.test(category.id)) {
      throw new Error(`Category id cannot be used as a canonical path: ${category.id}`)
    }
    const html = buildCategoryPage(category, categoryApis.get(category.id), {
      siteUrl,
      generatedAt,
      categories
    })
    await writeFile(join(outDir, 'category', `${category.id}.html`), html)
  }

  await writeFile(join(outDir, 'sitemap.xml'), buildSitemap({ apis, categories, siteUrl, generatedAt }))
  await writeFile(join(outDir, 'robots.txt'), buildRobots(siteUrl))

  console.log(`Built static SEO site in ${outDir}`)
  console.log(`  ${apis.length} API pages`)
  console.log(`  ${categories.length} category pages`)
  console.log(`  ${apis.length + categories.length + 1} canonical URLs in sitemap.xml`)
  console.log(`  site URL: ${siteUrl}`)
  console.log(`  generated at: ${generatedAt}`)
  if (categoryById.size !== categories.length) throw new Error('Duplicate category ids')
}

main().catch((error) => {
  console.error(`SEO build failed: ${error.message}`)
  process.exitCode = 1
})
