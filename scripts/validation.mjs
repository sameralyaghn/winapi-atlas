/**
 * Pure dataset validation used by scripts/validate.mjs and the negative tests.
 * Keeping this free of filesystem/process access makes every rule testable
 * without copying the repository into a temporary workspace.
 */
import {
  DOCS_KIND_VALUES,
  TELEMETRY_COVERAGE_VALUES,
  isReviewed
} from '../js/schema.js'

const SUSPICION = new Set(['low', 'medium', 'high'])
const MITRE_RE = /^T\d{4}(\.\d{3})?$/
const URL_RE = /^https:\/\/learn\.microsoft\.com\/\S+$/
const SOURCE_URL_RE = /^https:\/\/\S+$/
const REVIEW_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PRESET_KINDS = new Set(['chain', 'indicator'])

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isReviewDate(value, today) {
  if (typeof value !== 'string' || !REVIEW_DATE_RE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false
  return value <= today
}

export function validateDataset(apis, categories, presets, options = {}) {
  const today = options.today || new Date().toISOString().slice(0, 10)
  const errors = []
  const warnings = []

  if (!Array.isArray(apis) || !Array.isArray(categories) || !Array.isArray(presets)) {
    errors.push('Top-level JSON value must be an array in apis.json, categories.json and presets.json')
    return {
      errors,
      warnings,
      categoryCounts: {},
      docsCounts: { direct: 0, related: 0, none: 0 },
      telemetryCounts: { direct: 0, indirect: 0, none: 0, unknown: 0 },
      reviewedCount: 0,
      unverified: []
    }
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
  const names = new Set()
  const aliasOwners = new Map()
  const categoryCounts = {}

  for (const [i, api] of apis.entries()) {
    const where = `apis[${i}] (${api && api.name ? api.name : 'unnamed'})`
    if (!api || typeof api !== 'object') {
      errors.push(`apis[${i}]: not an object`)
      continue
    }
    for (const field of ['name', 'library', 'description', 'legit_use', 'suspicion']) {
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
    if (isNonEmptyString(api.docs) && !URL_RE.test(api.docs)) {
      errors.push(`${where}: docs must be an https URL on learn.microsoft.com`)
    }
    if (!DOCS_KIND_VALUES.includes(api.docs_kind)) {
      errors.push(`${where}: docs_kind must be direct|related|none`)
    } else if (api.docs_kind === 'none' && isNonEmptyString(api.docs)) {
      errors.push(`${where}: docs_kind is none but a docs URL is present`)
    } else if (api.docs_kind !== 'none' && !isNonEmptyString(api.docs)) {
      errors.push(`${where}: docs_kind is ${api.docs_kind} but no docs URL is present`)
    }
    if (api.reviewed_at !== null && !isReviewDate(api.reviewed_at, today)) {
      errors.push(`${where}: reviewed_at must be null or a valid ISO date that is not in the future`)
    }
    if (!Array.isArray(api.sources)) {
      errors.push(`${where}: sources must be an array`)
    } else {
      for (const source of api.sources) {
        if (!source || typeof source !== 'object' || !isNonEmptyString(source.label)) {
          errors.push(`${where}: each source needs a non-empty label`)
        }
        if (!source || typeof source.url !== 'string' || !SOURCE_URL_RE.test(source.url)) {
          errors.push(`${where}: each source needs an https URL`)
        }
      }
      if (isReviewed(api) && api.sources.length === 0) {
        errors.push(`${where}: reviewed_at requires at least one source`)
      }
      if (!isReviewed(api) && api.sources.length > 0) {
        errors.push(`${where}: sources require a reviewed_at date`)
      }
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
    if (!TELEMETRY_COVERAGE_VALUES.includes(api.telemetry_coverage)) {
      errors.push(`${where}: telemetry_coverage must be direct|indirect|none|unknown`)
    } else {
      const hasEvents = Boolean(
        (detection?.sysmon_events || []).length || (detection?.etw_providers || []).length
      )
      if ((api.telemetry_coverage === 'direct' || api.telemetry_coverage === 'indirect') && !hasEvents) {
        errors.push(`${where}: telemetry_coverage ${api.telemetry_coverage} requires a Sysmon or ETW mapping`)
      }
      if (api.telemetry_coverage === 'none' && hasEvents) {
        errors.push(`${where}: telemetry_coverage none conflicts with recorded Sysmon/ETW mappings`)
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

    for (const id of api.categories || []) {
      categoryCounts[id] = (categoryCounts[id] || 0) + 1
    }
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
    if (!PRESET_KINDS.has(preset.kind)) {
      errors.push(`${where}: kind must be chain|indicator`)
    }
    if (!preset.mitre || !MITRE_RE.test(preset.mitre.id || '') || !isNonEmptyString(preset.mitre.name)) {
      errors.push(`${where}: invalid mitre object`)
    }
    if (!Array.isArray(preset.required) || preset.required.length === 0) {
      errors.push(`${where}: required must be a non-empty array`)
    }
    if (preset.kind === 'chain') {
      if (Array.isArray(preset.required) && preset.required.length < 2) {
        errors.push(`${where}: chain presets require at least two required APIs`)
      }
      if (!Array.isArray(preset.sequence)) {
        errors.push(`${where}: chain presets require a sequence array`)
      } else if (Array.isArray(preset.required)) {
        if (preset.sequence.length !== preset.required.length) {
          errors.push(`${where}: sequence must contain exactly the required APIs`)
        }
        if (new Set(preset.sequence).size !== preset.sequence.length) {
          errors.push(`${where}: sequence must not contain duplicates`)
        }
        const requiredSet = new Set(preset.required)
        const sequenceSet = new Set(preset.sequence)
        if (preset.sequence.some((name) => !requiredSet.has(name)) || preset.required.some((name) => !sequenceSet.has(name))) {
          errors.push(`${where}: sequence must contain exactly the required APIs`)
        }
      }
    }
    if (preset.kind === 'indicator') {
      if (Array.isArray(preset.required) && preset.required.length !== 1) {
        errors.push(`${where}: indicator presets require exactly one required API`)
      }
      if (preset.sequence !== undefined) {
        errors.push(`${where}: indicator presets must not define a sequence`)
      }
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

  const docsCounts = { direct: 0, related: 0, none: 0 }
  const telemetryCounts = { direct: 0, indirect: 0, none: 0, unknown: 0 }
  for (const api of apis) {
    if (docsCounts[api.docs_kind] !== undefined) docsCounts[api.docs_kind] += 1
    if (telemetryCounts[api.telemetry_coverage] !== undefined) telemetryCounts[api.telemetry_coverage] += 1
  }

  return {
    errors,
    warnings,
    categoryCounts,
    docsCounts,
    telemetryCounts,
    reviewedCount: apis.filter((api) => isReviewed(api)).length,
    unverified: apis.filter((api) => api.verified === false).map((api) => api.name)
  }
}
