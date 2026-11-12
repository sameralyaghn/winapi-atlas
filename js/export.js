/**
 * Export builders. Every function is pure and returns a string so the formats
 * can be unit tested without a browser. `downloadFile` is the only DOM helper.
 */

import { SUSPICION_LABEL } from './state.js'

function sorted(apis) {
  return [...apis].sort((a, b) => a.name.localeCompare(b.name))
}

function aliases(api) {
  return (api.aliases || []).join('; ')
}

function categories(api) {
  return (api.categories || []).join('; ')
}

function mitreList(api) {
  return (api.mitre || []).map((tech) => `${tech.id} ${tech.name}`).join('; ')
}

function sysmon(api) {
  return (api.detection?.sysmon_events || []).join(' ')
}

function etw(api) {
  return (api.detection?.etw_providers || []).join('; ')
}

function sourceList(api) {
  return (api.sources || []).map((source) => `${source.label} <${source.url}>`).join('; ')
}

/** Escapes a value for RFC 4180 CSV. */
export function csvCell(value) {
  const text = value == null ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

const CSV_COLUMNS = [
  ['name', (api) => api.name],
  ['aliases', aliases],
  ['library', (api) => api.library],
  ['suspicion', (api) => api.suspicion],
  ['categories', categories],
  ['mitre', mitreList],
  ['docs', (api) => api.docs],
  ['docs_kind', (api) => api.docs_kind || ''],
  ['telemetry_coverage', (api) => api.telemetry_coverage || ''],
  ['reviewed_at', (api) => api.reviewed_at || ''],
  ['sources', sourceList],
  ['description', (api) => api.description],
  ['detection_summary', (api) => api.detection?.summary || ''],
  ['sysmon_events', sysmon],
  ['etw_providers', etw],
  ['legit_use', (api) => api.legit_use || ''],
  ['related', (api) => (api.related || []).join('; ')],
  ['verified', (api) => (api.verified ? 'true' : 'false')]
]

/** CSV with a header row and one line per API (CRLF ending). */
export function buildCsv(apis) {
  const lines = [CSV_COLUMNS.map(([header]) => header).join(',')]
  for (const api of sorted(apis)) {
    lines.push(CSV_COLUMNS.map(([, getter]) => csvCell(getter(api))).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

/** Pretty-printed JSON envelope with generation metadata. */
export function buildJson(apis, meta = {}) {
  const payload = {
    format: 'winapi-atlas',
    version: 1,
    generated_at: meta.generatedAt || new Date().toISOString(),
    scope: meta.scope || 'catalog',
    count: apis.length,
    apis: sorted(apis)
  }
  return JSON.stringify(payload, null, 2) + '\n'
}

function mdCell(value) {
  return String(value == null ? '' : value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

/** GitHub-flavoured Markdown table. */
export function buildMarkdown(apis) {
  const header = '| API | Library | Suspicion | Categories | MITRE | Description |\n| --- | --- | --- | --- | --- | --- |'
  const rows = sorted(apis).map((api) => {
    const mitre = (api.mitre || []).map((tech) => `${tech.id} ${tech.name}`).join(', ')
    return `| \`${mdCell(api.name)}\` | ${mdCell(api.library)} | ${SUSPICION_LABEL[api.suspicion] || api.suspicion} | ${mdCell(categories(api))} | ${mdCell(mitre)} | ${mdCell(api.description)} |`
  })
  return `${header}\n${rows.join('\n')}\n`
}

/**
 * Sigma-style hunt hints: a YAML-shaped comment block plus technique chains
 * and per-category API groupings that a detection engineer can paste into a
 * rule back-log. It intentionally does not pretend to be a valid Sigma rule.
 */
export function buildSigmaHints(apis, techniques = [], categories = [], meta = {}) {
  const scope = meta.selection ? 'selection' : 'catalog'
  const include = new Set(apis.map((api) => api.name))
  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  const byCategory = new Map()

  for (const api of sorted(apis)) {
    for (const id of api.categories || []) {
      if (!byCategory.has(id)) byCategory.set(id, [])
      byCategory.get(id).push(api.name)
    }
  }

  const lines = []
  lines.push('# WinAPI Atlas - hunt hints (Sigma-style)')
  lines.push('# For defensive detection engineering only. Not a runnable Sigma rule.')
  if (meta.generatedAt) lines.push(`# Generated: ${meta.generatedAt}`)
  lines.push(`# Scope: ${scope} (${apis.length} APIs)`)
  lines.push('')
  lines.push('title: Suspicious Windows API usage')
  lines.push('status: experimental')
  lines.push('description: API combinations to hunt for in process, image-load, registry and network telemetry.')
  lines.push('logsource:')
  lines.push('  product: windows')
  lines.push('detection_hints:')

  const matches = techniques.filter((match) => {
    const matched = [...(match.matchedRequired || []), ...(match.matchedOptional || [])]
    return matched.some((name) => include.has(name))
  })

  if (!matches.length) {
    lines.push('  # Select APIs in the app to see technique-chain hints here.')
  }

  for (const match of matches) {
    const preset = match.preset || match
    const status = match.kind === 'indicator'
      ? (match.complete ? 'indicator_observed' : 'indicator_incomplete')
      : match.completeOrdered
        ? 'complete_ordered'
        : match.complete
          ? 'out_of_order'
          : 'possible_sequence'
    lines.push(`  - name: ${preset.title}`)
    lines.push(`    technique: ${preset.mitre?.id || ''} ${preset.mitre?.name || ''}`.trimEnd())
    lines.push(`    match: ${match.score}%`)
    lines.push(`    status: ${status}`)
    if ((match.sequence || []).length) lines.push(`    sequence: [${match.sequence.join(', ')}]`)
    if ((match.outOfOrder || []).length) lines.push(`    out_of_order: [${match.outOfOrder.join(', ')}]`)
    lines.push(`    apis: [${(match.matchedRequired || []).concat(match.matchedOptional || []).join(', ')}]`)
    if ((match.missingRequired || []).length) {
      lines.push(`    missing_required: [${match.missingRequired.join(', ')}]`)
    }
    lines.push(`    note: ${preset.defender_note}`)
  }

  lines.push('hunt_for:')
  for (const api of sorted(apis).filter((item) => item.suspicion !== 'low')) {
    const detection = api.detection || {}
    const events = detection.sysmon_events || []
    const providers = detection.etw_providers || []
    lines.push(`  - api: ${api.name}`)
    lines.push(`    library: ${api.library}`)
    lines.push(`    suspicion: ${api.suspicion}`)
    if (events.length) lines.push(`    sysmon: [${events.join(', ')}]`)
    if (providers.length) lines.push(`    etw: [${providers.join(', ')}]`)
    lines.push(`    categories: [${(api.categories || []).join(', ')}]`)
    lines.push(`    hint: ${detection.summary || api.description}`)
  }

  lines.push('category_groups:')
  for (const [id, names] of byCategory) {
    const category = categoryMap.get(id)
    lines.push(`  - category: ${category ? category.title : id}`)
    lines.push(`    apis: [${names.join(', ')}]`)
  }

  lines.push('falsepositives:')
  lines.push('  - Legitimate installers, updaters, backup agents, debuggers and security products use the same APIs.')
  lines.push('  - Correlate with process lineage, signature status, destination reputation and user context.')
  lines.push('level: medium')
  return lines.join('\n') + '\n'
}

/** Triggers a client-side download. No-op outside the browser (tests). */
export function downloadFile(filename, text, mime = 'text/plain') {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

/** Suggests a dated filename for an export. */
export function exportFilename(extension, scope, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10)
  return `winapi-atlas-${scope}-${stamp}.${extension}`
}
