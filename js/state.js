/**
 * Pure application state: filters, search scoring, technique inference and
 * URL-hash serialisation. No DOM access here, which keeps the module testable
 * with the plain Node test runner.
 */

import {
  DOCS_KIND_VALUES,
  REVIEW_STATUS_VALUES,
  TELEMETRY_COVERAGE_VALUES,
  isReviewed
} from './schema.js'

export const SUSPICION_LEVELS = ['low', 'medium', 'high']

export const SUSPICION_LABEL = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
}

/** Default state for a fresh visit. */
export function emptyState(theme = 'dark') {
  return {
    query: '',
    categories: [],
    libraries: [],
    suspicion: [],
    mitre: '',
    docsKind: '',
    telemetry: '',
    review: '',
    selection: [],
    importFilter: false,
    mapping: false,
    theme,
    api: null
  }
}

/** Returns a new array with `value` toggled, preserving insertion order. */
export function toggleValue(list, value) {
  const index = list.indexOf(value)
  if (index === -1) return [...list, value]
  return list.filter((item) => item !== value)
}

/** Lowercased searchable text for an API, cached on the object. */
export function searchText(api) {
  if (api.__search) return api.__search
  const detection = api.detection || {}
  const text = [
    api.name,
    (api.aliases || []).join(' '),
    api.library,
    api.description,
    (api.categories || []).join(' '),
    (api.mitre || []).map((tech) => `${tech.id} ${tech.name}`).join(' '),
    detection.summary,
    detection.notes,
    api.legit_use
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  Object.defineProperty(api, '__search', { value: text, enumerable: false, writable: true })
  return text
}

function isSubsequence(needle, haystack) {
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index += 1
    if (index === needle.length) return true
  }
  return needle.length === 0
}

/**
 * Scores one API against a list of query tokens. Returns null when any token
 * fails to match, so callers can treat a number as "match".
 */
export function scoreApi(api, tokens) {
  if (!tokens.length) return 0
  const name = api.name.toLowerCase()
  const aliases = (api.aliases || []).map((alias) => alias.toLowerCase())
  const text = searchText(api)
  let score = 0

  for (const token of tokens) {
    let tokenScore = 0
    if (name === token) tokenScore = 120
    else if (name.startsWith(token)) tokenScore = 80
    else if (name.includes(token)) tokenScore = 55
    else if (aliases.some((alias) => alias.includes(token))) tokenScore = 40
    else if (text.includes(token)) tokenScore = 20
    else if (token.length > 2 && isSubsequence(token, name)) tokenScore = 10
    if (!tokenScore) return null
    score += tokenScore
  }
  return score
}

export function tokenize(query) {
  return String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/** True when every active filter accepts this API. */
export function matchesFilters(api, state, tokens = tokenize(state.query)) {
  if (state.libraries.length && !state.libraries.includes(api.library)) return false
  if (state.suspicion.length && !state.suspicion.includes(api.suspicion)) return false
  if (state.mitre && !(api.mitre || []).some((tech) => tech.id === state.mitre)) return false
  if (state.docsKind && api.docs_kind !== state.docsKind) return false
  if (state.telemetry && api.telemetry_coverage !== state.telemetry) return false
  if (state.review && isReviewed(api) !== (state.review === 'reviewed')) return false
  if (tokens.length && scoreApi(api, tokens) === null) return false
  return true
}

/** Filters and sorts the catalog for the current state. */
export function filterApis(apis, state) {
  const tokens = tokenize(state.query)
  const imported = state.importFilter && state.selection.length
    ? new Set(state.selection)
    : null
  const matched = []
  for (const api of apis) {
    if (imported && !imported.has(api.name)) continue
    if (!matchesFilters(api, state, tokens)) continue
    matched.push(api)
  }
  if (tokens.length) {
    const scored = matched.map((api) => ({ api, score: scoreApi(api, tokens) || 0 }))
    scored.sort((a, b) => b.score - a.score || a.api.name.localeCompare(b.api.name))
    return scored.map((item) => item.api)
  }
  matched.sort((a, b) => a.name.localeCompare(b.name))
  return matched
}

/**
 * Groups filtered APIs by category. Every category gets a bucket (possibly
 * empty) so columns stay in a stable order while typing.
 */
export function groupByCategory(apis, categories) {
  const groups = new Map()
  for (const category of categories) groups.set(category.id, [])
  for (const api of apis) {
    for (const id of api.categories || []) {
      if (groups.has(id)) groups.get(id).push(api)
    }
  }
  return groups
}

/** True when the board is narrowed by a search, a facet or Paste Imports. */
export function hasBoardFilter(state) {
  return Boolean(
    state.query.trim() ||
    state.categories.length ||
    state.libraries.length ||
    state.suspicion.length ||
    state.mitre ||
    state.docsKind ||
    state.telemetry ||
    state.review ||
    (state.importFilter && state.selection.length)
  )
}

/**
 * Categories that should currently be rendered as columns. When a filter is
 * active and groups are supplied, zero-result categories are dropped too.
 */
export function visibleCategories(categories, state, groups = null) {
  const scoped = state.categories.length
    ? categories.filter((category) => state.categories.includes(category.id))
    : categories
  if (!groups || !hasBoardFilter(state)) return scoped
  return scoped.filter((category) => (groups.get(category.id) || []).length > 0)
}

/** Counts the selection per category, in catalog column order. */
export function selectionBreakdown(selectedNames, apis, categories) {
  const selected = new Set(selectedNames)
  const counts = new Map()
  let total = 0
  for (const api of apis) {
    if (!selected.has(api.name)) continue
    total += 1
    for (const id of api.categories || []) counts.set(id, (counts.get(id) || 0) + 1)
  }
  return {
    total,
    categories: categories
      .filter((category) => counts.has(category.id))
      .map((category) => ({ id: category.id, title: category.title, count: counts.get(category.id) }))
  }
}

/**
 * Scores a technique preset against the selection.
 *
 * Chain presets use 60% required membership, 20% required ordering and 20%
 * optional coverage. Indicator presets have no sequence, so their required
 * membership is worth 80% and optional coverage 20%. A partial required match
 * never earns order credit, and only a chain with every required API in the
 * intended sequence can be completeOrdered.
 */
export function scorePreset(preset, selectedNames) {
  const selected = new Set(selectedNames)
  const required = preset.required || []
  const optional = preset.optional || []
  const kind = preset.kind || (required.length === 1 ? 'indicator' : 'chain')
  const sequence = kind === 'chain'
    ? (Array.isArray(preset.sequence) && preset.sequence.length ? preset.sequence : required)
    : []
  const matchedRequired = required.filter((name) => selected.has(name))
  const matchedOptional = optional.filter((name) => selected.has(name))
  const missingRequired = required.filter((name) => !selected.has(name))
  const selectedRequired = selectedNames.filter((name) => required.includes(name))

  let lastIndex = -1
  const outOfOrder = []
  for (const name of selectedRequired) {
    const index = sequence.indexOf(name)
    if (index === -1) continue
    if (index < lastIndex) outOfOrder.push(name)
    else lastIndex = index
  }

  const ordered = kind === 'chain' && outOfOrder.length === 0
  const orderApplicable = kind === 'chain' && sequence.length > 1 && selectedRequired.length > 1
  const requiredRatio = required.length ? matchedRequired.length / required.length : 0
  const optionalRatio = optional.length ? matchedOptional.length / optional.length : 0
  const membershipWeight = kind === 'indicator' ? 80 : 60
  const membershipScore = Math.round(membershipWeight * requiredRatio)
  const orderScore = orderApplicable && ordered ? 20 : 0
  const optionalScore = Math.round(20 * optionalRatio)
  const complete = required.length > 0 && matchedRequired.length === required.length
  const completeOrdered = kind === 'chain' && required.length > 1 && complete && ordered

  return {
    kind,
    score: membershipScore + orderScore + optionalScore,
    membershipScore,
    orderScore,
    optionalScore,
    sequence,
    matchedRequired,
    matchedOptional,
    selectedRequired,
    missingRequired,
    ordered,
    orderApplicable,
    outOfOrder,
    complete,
    completeOrdered
  }
}

/**
 * All presets worth showing for a selection, strongest first.
 * A preset needs at least one required API and a minimum score to appear.
 */
export function matchTechniques(selectedNames, presets, minimumScore = 30) {
  if (!selectedNames.length) return []
  return presets
    .map((preset) => ({ preset, ...scorePreset(preset, selectedNames) }))
    .filter((match) => match.matchedRequired.length > 0 && match.score >= minimumScore)
    .sort((a, b) =>
      Number(b.completeOrdered) - Number(a.completeOrdered) ||
      Number(b.complete) - Number(a.complete) ||
      b.score - a.score ||
      a.preset.title.localeCompare(b.preset.title)
    )
}

/** Serialises list parameters, keeping names readable in the address bar. */
function encodeList(values) {
  return values.map((value) => encodeURIComponent(value)).join(',')
}

function decodeList(raw) {
  if (!raw) return []
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    })
}

/**
 * Parses `#?q=...` state hashes and the short `#CreateRemoteThread` deep link.
 * Unknown keys are ignored, malformed values fall back to defaults.
 */
export function parseHash(hash) {
  const out = {}
  if (!hash) return out
  let body = hash.startsWith('#') ? hash.slice(1) : hash
  if (!body) return out

  if (!body.startsWith('?')) {
    try {
      body = decodeURIComponent(body)
    } catch {
      return out
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(body)) out.api = body
    return out
  }

  let params
  try {
    params = new URLSearchParams(body.slice(1))
  } catch {
    return out
  }
  if (params.has('q')) out.query = params.get('q') || ''
  if (params.has('cat')) out.categories = decodeList(params.get('cat'))
  if (params.has('lib')) out.libraries = decodeList(params.get('lib'))
  if (params.has('sus')) out.suspicion = decodeList(params.get('sus')).filter((level) => SUSPICION_LEVELS.includes(level))
  if (params.has('mit')) out.mitre = params.get('mit') || ''
  if (params.has('docs') && DOCS_KIND_VALUES.includes(params.get('docs'))) out.docsKind = params.get('docs')
  if (params.has('tel') && TELEMETRY_COVERAGE_VALUES.includes(params.get('tel'))) out.telemetry = params.get('tel')
  if (params.has('rev') && REVIEW_STATUS_VALUES.includes(params.get('rev'))) out.review = params.get('rev')
  if (params.has('sel')) out.selection = decodeList(params.get('sel'))
  if (params.has('mode')) out.mapping = params.get('mode') === '1'
  if (params.has('theme')) out.theme = params.get('theme') === 'light' ? 'light' : 'dark'
  if (params.has('api')) out.api = params.get('api') || null
  return out
}

/** Builds the shareable hash for a state. Returns '' for the default view. */
export function serializeState(state) {
  const params = new URLSearchParams()
  if (state.query) params.set('q', state.query)
  if (state.categories.length) params.set('cat', encodeList(state.categories))
  if (state.libraries.length) params.set('lib', encodeList(state.libraries))
  if (state.suspicion.length) params.set('sus', state.suspicion.join(','))
  if (state.mitre) params.set('mit', state.mitre)
  if (state.docsKind) params.set('docs', state.docsKind)
  if (state.telemetry) params.set('tel', state.telemetry)
  if (state.review) params.set('rev', state.review)
  if (state.selection.length) params.set('sel', encodeList(state.selection))
  if (state.mapping) params.set('mode', '1')
  if (state.theme === 'light') params.set('theme', 'light')
  if (state.api) params.set('api', state.api)

  const query = params.toString()
  if (!query) return ''
  const nonApiKeys = [...params.keys()].filter((key) => key !== 'api')
  if (nonApiKeys.length === 0 && state.api) return `#${encodeURIComponent(state.api)}`
  return `#?${query}`
}

/** Drops selection names that are missing from the catalog and de-duplicates. */
export function sanitizeSelection(names, byName) {
  const out = []
  for (const name of names || []) {
    if (byName.has(name) && !out.includes(name)) out.push(name)
  }
  return out
}

/** Summary of active filters, used for counts and the reset button. */
export function activeFilterCount(state) {
  return state.categories.length + state.libraries.length + state.suspicion.length +
    (state.mitre ? 1 : 0) + (state.docsKind ? 1 : 0) + (state.telemetry ? 1 : 0) +
    (state.review ? 1 : 0) + (state.query ? 1 : 0) +
    (state.importFilter && state.selection.length ? 1 : 0)
}

/**
 * Reads the optional `?q=` search landing parameter. Canonical API and
 * category query links are redirected before this runs; app state is hash-based.
 */
export function parseQuery(search) {
  const out = {}
  if (!search) return out
  let params
  try {
    params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  } catch {
    return out
  }
  if (params.has('q')) out.query = params.get('q') || ''
  return out
}

/** Strips stdcall/import decorations analysts see in disassembly listings. */
function cleanImportToken(token) {
  return token
    .replace(/^__imp_/i, '')
    .replace(/^_+/, '')
    .replace(/@\d+$/, '')
}

/**
 * Builds the lookup used by the Paste Imports analyser. Exact catalog names win
 * over generated variant keys, so `CreateFileW` resolves to its own entry rather
 * than to `CreateFileA`'s base name.
 */
function importIndex(apis) {
  const exact = new Map()
  for (const api of apis) exact.set(api.name.toLowerCase(), api.name)

  const variants = new Map(exact)
  for (const api of apis) {
    let stem = api.name
    if (/[AW]$/.test(stem)) stem = stem.slice(0, -1)
    if (/Ex$/.test(stem)) stem = stem.slice(0, -2)
    if (!stem) continue
    for (const suffix of ['', 'A', 'W', 'Ex', 'AEx', 'WEx']) {
      const key = `${stem}${suffix}`.toLowerCase()
      if (!variants.has(key)) variants.set(key, api.name)
    }
  }
  return variants
}

/**
 * Matches free-form import text (dumpbin, rabin2, PEStudio, raw strings) against
 * the catalog, honouring A/W/Ex variants and `__imp_`/`@N` decorations.
 * Returns canonical catalog names in order of first appearance.
 */
export function matchImportNames(text, apis) {
  const source = String(text || '').slice(0, 200000)
  if (!source) return []
  const index = importIndex(apis)
  const found = new Set()
  for (const match of source.matchAll(/[A-Za-z_][A-Za-z0-9_@$?]*/g)) {
    const token = cleanImportToken(match[0])
    if (token.length < 3) continue
    const name = index.get(token.toLowerCase())
    if (name) found.add(name)
  }
  return [...found]
}
