#!/usr/bin/env node
/**
 * Validates data/apis.json, data/categories.json and data/presets.json.
 * Exits with code 1 if any error is found.
 *
 * Usage: node scripts/validate.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateDataset } from './validation.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const parseErrors = []

function readJson(relative) {
  const path = join(root, relative)
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    parseErrors.push(`${relative}: cannot parse JSON (${err.message})`)
    return null
  }
}

const apis = readJson('data/apis.json')
const categories = readJson('data/categories.json')
const presets = readJson('data/presets.json')
const arraysOk = Array.isArray(apis) && Array.isArray(categories) && Array.isArray(presets)

const result = arraysOk
  ? validateDataset(apis, categories, presets)
  : {
      errors: ['Top-level JSON value must be an array in apis.json, categories.json and presets.json'],
      warnings: [],
      categoryCounts: {},
      docsCounts: { direct: 0, related: 0, none: 0 },
      telemetryCounts: { direct: 0, indirect: 0, none: 0, unknown: 0 },
      reviewedCount: 0,
      unverified: []
    }

const errors = [...parseErrors, ...result.errors]
const apisList = Array.isArray(apis) ? apis : []
const categoriesList = Array.isArray(categories) ? categories : []
const presetsList = Array.isArray(presets) ? presets : []

/* ---------- report ---------- */
console.log(`APIs: ${apisList.length}`)
console.log(`Categories: ${categoriesList.length}`)
console.log(`Technique presets: ${presetsList.length}`)
console.log(`APIs per category: ${Object.entries(result.categoryCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`)
console.log(`Entries marked verified:false: ${result.unverified.length}${result.unverified.length ? ' -> ' + result.unverified.join(', ') : ''}`)
console.log(`Documentation kinds: ${Object.entries(result.docsCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`)
console.log(`Telemetry coverage: ${Object.entries(result.telemetryCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`)
console.log(`Human-reviewed entries: ${result.reviewedCount}`)

for (const warning of result.warnings) console.log(`warning: ${warning}`)
if (errors.length) {
  console.error(`\n${errors.length} error(s):`)
  for (const error of errors) console.error(`  - ${error}`)
  console.error('\nValidation FAILED')
  process.exit(1)
}
console.log('\nValidation passed with 0 errors')
