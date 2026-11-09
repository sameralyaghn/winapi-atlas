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

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []

function readJson(relative) {
  const path = join(root, relative)
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    errors.push(`${relative}: cannot parse JSON (${err.message})`)
    return null
  }
}

const apis = readJson('data/apis.json')
const categories = readJson('data/categories.json')
const presets = readJson('data/presets.json')

if (!Array.isArray(apis) || !Array.isArray(categories) || !Array.isArray(presets)) {
  errors.push('Top-level JSON value must be an array in apis.json, categories.json and presets.json')
  report()
}

/* ---------- categories ---------- */
const categoryIds = new Set()
for (const [i, cat] of categories.entries()) {
  const where = `categories[${i}]`
  if (typeof cat.id !== 'string' || !/^[a-z0-9-]+$/.test(cat.id)) errors.push(`${where}: invalid id`)
  if (categoryIds.has(cat.id)) errors.push(`${where}: duplicate category id "${cat.id}"`)
  categoryIds.add(cat.id)
  for (const field of ['title', 'description', 'explanation']) {
    if (typeof cat[field] !== 'string' || cat[field].trim() === '') errors.push(`${where}: missing ${field}`)
  }
  if (typeof cat.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(cat.color)) errors.push(`${where}: invalid color "${cat.color}"`)
}

/* ---------- apis ---------- */
const SUSPICION = new Set(['low', 'medium', 'high'])
const MITRE_RE = /^T\d{4}(\.\d{3})?$/
const URL_RE = /^https:\/\/learn\.microsoft\.com\/\S+$/
const names = new Set()
const aliasOwners = new Map()

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

for (const [i, api] of apis.entries()) {
  const where = `apis[${i}] (${api && api.name ? api.name : 'unnamed'})`
  if (!api || typeof api !== 'object') {
    errors.push(`apis[${i}]: not an object`)
    continue
  }
  for (const field of ['name', 'library', 'description', 'docs', 'legit_use', 'suspicion']) {
    if (!isNonEmptyString(api[field])) errors.push(`${where}: missing or empty "${field}"`)
  }
  if (typeof api.name === 'string') {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(api.name)) errors.push(`${where}: name is not a valid identifier`)
    if (names.has(api.name)) errors.push(`${where}: duplicate name`)
    names.add(api.name)
  }
  if (api.aliases !== undefined) {
    if (!Array.isArray(api.aliases) || api.aliases.some((a) => !isNonEmptyString(a))) {
      errors.push(`${where}: aliases must be an array of strings`)
    } else {
      for (const alias of api.aliases) {
        if (names.has(alias) || aliasOwners.has(alias)) errors.push(`${where}: alias "${alias}" collides with an existing API name`)
        aliasOwners.set(alias, api.name)
      }
    }
  }
  if (typeof api.suspicion === 'string' && !SUSPICION.has(api.suspicion)) {
    errors.push(`${where}: suspicion must be low|medium|high`)
  }
  if (!Array.isArray(api.categories) || api.categories.length === 0) {
    errors.push(`${where}: at least one category is required`)
  } else {
    for (const id of api.categories) {
      if (!categoryIds.has(id)) errors.push(`${where}: unknown category "${id}"`)
    }
    if (new Set(api.categories).size !== api.categories.length) errors.push(`${where}: duplicate categories`)
  }
  if (!Array.isArray(api.mitre)) {
    errors.push(`${where}: mitre must be an array`)
  } else {
    for (const tech of api.mitre) {
      if (!tech || typeof tech.id !== 'string' || !MITRE_RE.test(tech.id)) errors.push(`${where}: invalid MITRE id "${tech && tech.id}"`)
      if (!tech || !isNonEmptyString(tech.name)) errors.push(`${where}: MITRE technique needs a name`)
    }
  }
  if (typeof api.docs === 'string' && !URL_RE.test(api.docs)) {
    errors.push(`${where}: docs must be an https URL on learn.microsoft.com`)
  }
  const detection = api.detection
  if (!detection || typeof detection !== 'object') {
    errors.push(`${where}: detection object is required`)
  } else {
    if (!isNonEmptyString(detection.summary)) errors.push(`${where}: detection.summary is required`)
    if (detection.sysmon_events !== undefined) {
      if (!Array.isArray(detection.sysmon_events) || detection.sysmon_events.some((n) => !Number.isInteger(n) || n <= 0 || n > 255)) {
        errors.push(`${where}: detection.sysmon_events must be an array of event IDs`)
      }
    }
    if (detection.etw_providers !== undefined) {
      if (!Array.isArray(detection.etw_providers) || detection.etw_providers.some((p) => !isNonEmptyString(p))) {
        errors.push(`${where}: detection.etw_providers must be an array of strings`)
      }
    }
  }
  if (!Array.isArray(api.related)) {
    errors.push(`${where}: related must be an array`)
  } else {
    for (const rel of api.related) {
      if (rel === api.name) warnings.push(`${where}: related references itself`)
    }
  }
  if (typeof api.verified !== 'boolean') errors.push(`${where}: verified must be a boolean`)
}

// Related entries must resolve, so check after all names are known.
for (const api of apis) {
  if (!Array.isArray(api.related)) continue
  for (const rel of api.related) {
    if (!names.has(rel)) errors.push(`apis ("${api.name}"): related entry "${rel}" does not exist`)
  }
}

/* ---------- presets ---------- */
const presetIds = new Set()
for (const [i, preset] of presets.entries()) {
  const where = `presets[${i}] (${preset && preset.id ? preset.id : 'unnamed'})`
  if (!preset || typeof preset !== 'object') {
    errors.push(`presets[${i}]: not an object`)
    continue
  }
  for (const field of ['id', 'title', 'defender_note']) {
    if (!isNonEmptyString(preset[field])) errors.push(`${where}: missing ${field}`)
  }
  if (presetIds.has(preset.id)) errors.push(`${where}: duplicate preset id`)
  presetIds.add(preset.id)
  if (!preset.mitre || !MITRE_RE.test(preset.mitre.id || '') || !isNonEmptyString(preset.mitre.name)) {
    errors.push(`${where}: invalid mitre object`)
  }
  if (!Array.isArray(preset.required) || preset.required.length === 0) {
    errors.push(`${where}: required must be a non-empty array`)
  }
  if (!Array.isArray(preset.optional)) errors.push(`${where}: optional must be an array`)
  for (const listName of ['required', 'optional']) {
    const list = preset[listName]
    if (!Array.isArray(list)) continue
    for (const name of list) {
      if (!names.has(name)) errors.push(`${where}: ${listName} API "${name}" does not exist in apis.json`)
    }
    if (new Set(list).size !== list.length) errors.push(`${where}: duplicate names in ${listName}`)
  }
  for (const name of preset.required || []) {
    if ((preset.optional || []).includes(name)) errors.push(`${where}: "${name}" is both required and optional`)
  }
}

/* ---------- report ---------- */
function report() {
  const counts = {}
  for (const api of apis || []) {
    for (const id of api.categories || []) counts[id] = (counts[id] || 0) + 1
  }
  const unverified = (apis || []).filter((a) => a.verified === false).map((a) => a.name)
  console.log(`APIs: ${(apis || []).length}`)
  console.log(`Categories: ${(categories || []).length}`)
  console.log(`Technique presets: ${(presets || []).length}`)
  console.log(`APIs per category: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}`)
  console.log(`Entries marked verified:false: ${unverified.length}${unverified.length ? ' -> ' + unverified.join(', ') : ''}`)

  for (const warning of warnings) console.log(`warning: ${warning}`)
  if (errors.length) {
    console.error(`\n${errors.length} error(s):`)
    for (const error of errors) console.error(`  - ${error}`)
    console.error('\nValidation FAILED')
    process.exit(1)
  }
  console.log('\nValidation passed with 0 errors')
}

report()
