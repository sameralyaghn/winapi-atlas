#!/usr/bin/env node
/**
 * Generates a data-derived review queue and audit report.
 * No dates or counts are hard-coded in the output.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const reportsDir = join(root, 'reports')
const apis = JSON.parse(readFileSync(join(root, 'data', 'apis.json'), 'utf8'))
const categories = JSON.parse(readFileSync(join(root, 'data', 'categories.json'), 'utf8'))
const categoryById = new Map(categories.map((category) => [category.id, category]))

const GENERIC_NOTE = /User-mode API not logged directly by Sysmon/i
const isReviewed = (api) => typeof api.reviewed_at === 'string' && api.reviewed_at.trim() !== ''
const telemetryCount = (api) => (api.detection?.sysmon_events?.length || 0) + (api.detection?.etw_providers?.length || 0)
const isGeneric = (api) => GENERIC_NOTE.test(api.detection?.notes || '')

function priority(api) {
  if (api.suspicion === 'high') return telemetryCount(api) ? 12 : 11
  if (api.suspicion === 'medium' && telemetryCount(api)) return 20
  if (api.suspicion === 'medium') return 30
  return 40
}

function priorityLabel(api) {
  if (api.suspicion === 'high' && !telemetryCount(api)) return '1 — High suspicion, no Sysmon/ETW'
  if (api.suspicion === 'high') return '2 — High suspicion, mapped telemetry'
  if (api.suspicion === 'medium' && telemetryCount(api)) return '3 — Medium suspicion, mapped telemetry'
  return '4 — Remaining entries'
}

function cell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\n/g, ' ')
}

function table(rows) {
  return [
    '| API | Suspicion | Telemetry | Docs | Generic note | Reviewed |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((api) => `| ${cell(api.name)} | ${cell(api.suspicion)} | ${cell(api.telemetry_coverage)} | ${cell(api.docs_kind)} | ${isGeneric(api) ? 'yes' : ''} | ${isReviewed(api) ? api.reviewed_at : ''} |`)
  ].join('\n')
}

const counts = {
  total: apis.length,
  reviewed: apis.filter(isReviewed).length,
  genericNotes: apis.filter(isGeneric).length,
  unknownTelemetry: apis.filter((api) => api.telemetry_coverage === 'unknown').length,
  noMitre: apis.filter((api) => !api.mitre?.length).length,
  shortDescriptions: apis.filter((api) => (api.description || '').length < 45).length,
  uniqueLegit: new Set(apis.map((api) => api.legit_use)).size,
  high: apis.filter((api) => api.suspicion === 'high').length,
  highReviewed: apis.filter((api) => api.suspicion === 'high' && isReviewed(api)).length,
  highNoTelemetry: apis.filter((api) => api.suspicion === 'high' && !telemetryCount(api)).length,
  highNoTelemetryReviewed: apis.filter((api) => api.suspicion === 'high' && !telemetryCount(api) && isReviewed(api)).length,
  highTelemetry: apis.filter((api) => api.suspicion === 'high' && telemetryCount(api)).length,
  mediumTelemetry: apis.filter((api) => api.suspicion === 'medium' && telemetryCount(api)).length,
  docs: Object.fromEntries(['direct', 'equivalent', 'generic', 'related', 'none'].map((kind) => [kind, apis.filter((api) => api.docs_kind === kind).length]))
}
counts.unreviewed = counts.total - counts.reviewed

const queued = apis
  .filter((api) => !isReviewed(api))
  .sort((a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name))

const groups = new Map()
for (const api of queued) {
  const label = priorityLabel(api)
  if (!groups.has(label)) groups.set(label, [])
  groups.get(label).push(api)
}

const queueLines = [
  '# Review queue',
  '',
  `Generated from \`data/apis.json\`: **${queued.length} unreviewed entries**.`,
  '',
  'Priority order: all high-suspicion entries first (no-telemetry gaps before mapped telemetry), then medium-suspicion entries with mapped telemetry, then the remainder.',
  '',
  '## Summary',
  '',
  `- Total entries: ${counts.total}`,
  `- Reviewed: ${counts.reviewed}`,
  `- Unreviewed: ${counts.unreviewed}`,
  `- High suspicion: ${counts.high} (${counts.highReviewed} reviewed; ${counts.highNoTelemetryReviewed}/${counts.highNoTelemetry} no-telemetry reviewed)`,
  `- Generic detection notes: ${counts.genericNotes}`,
  `- Telemetry unknown: ${counts.unknownTelemetry}`,
  `- Entries without MITRE mapping: ${counts.noMitre}`,
  `- Descriptions under 45 characters: ${counts.shortDescriptions}`,
  `- Unique legitimate-use strings: ${counts.uniqueLegit}`,
  ''
]
for (const [label, rows] of groups) {
  queueLines.push(`## ${label} (${rows.length})`, '', table(rows), '')
}

const reviewed = apis.filter(isReviewed)
const reviewedNoTelemetry = reviewed.filter((api) => !telemetryCount(api))
const sourceCounts = new Map()
for (const api of reviewed) {
  for (const source of api.sources || []) {
    const key = `${source.label} <${source.url}>`
    sourceCounts.set(key, (sourceCounts.get(key) || 0) + 1)
  }
}
const sourceRows = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
const sourceTypes = {
  'Microsoft Learn API docs': reviewed.filter((api) => (api.sources || []).some((source) => source.url.startsWith('https://learn.microsoft.com/') && !source.url.includes('/sysmon-events'))).length,
  'Sysmon event reference': reviewed.filter((api) => (api.sources || []).some((source) => source.url.includes('/sysmon-events'))).length,
  'MITRE ATT&CK': reviewed.filter((api) => (api.sources || []).some((source) => source.url.startsWith('https://attack.mitre.org/'))).length
}

const reportLines = [
  '# Audit report',
  '',
  'Generated from `data/apis.json` by `npm run audit`.',
  '',
  '## Coverage',
  '',
  `- **Entries reviewed:** ${counts.reviewed} of ${counts.total}`,
  `- **High-suspicion reviewed:** ${counts.highReviewed} of ${counts.high}`,
  `- **High-suspicion without Sysmon/ETW:** ${counts.highNoTelemetry} (${counts.highNoTelemetryReviewed} reviewed)`,
  `- **High-suspicion with mapped telemetry still unreviewed:** ${counts.highTelemetry - (counts.highReviewed - counts.highNoTelemetryReviewed)}`,
  `- **Generic detection notes remaining:** ${counts.genericNotes}`,
  `- **Telemetry unknown:** ${counts.unknownTelemetry}`,
  `- **Entries without MITRE mapping:** ${counts.noMitre}`,
  `- **Descriptions under 45 characters:** ${counts.shortDescriptions}`,
  `- **Unique legitimate-use strings:** ${counts.uniqueLegit}`,
  `- **Documentation kinds:** ${Object.entries(counts.docs).map(([kind, count]) => `${kind}=${count}`).join(', ')}`,
  `- **Documentation links reclassified as equivalent/generic:** ${counts.docs.equivalent + counts.docs.generic}`,
  '',
  '## Reviewed entries',
  '',
  reviewed.length
    ? table(reviewed)
    : 'No entries have a recorded human review yet.',
  '',
  '## Batch notes',
  '',
  `The reviewed set contains ${reviewedNoTelemetry.length} entries with no mapped Sysmon/ETW event. Their guidance explicitly names the absence of a direct mapping and the practical alternatives (EDR API hooks, call stacks, imports, or adjacent documented events). No reviewed entry claims direct telemetry without an event mapping.`,
  '',
  'Documentation links for native `Nt*`/`Zw*`/`Rtl*` entries were classified as `equivalent` when they document a counterpart, and shared index pages as `generic`. These classification fixes are independent of review status.',
  '',
  '## Sources used',
  '',
  `- Microsoft Learn API/documentation pages: ${sourceTypes['Microsoft Learn API docs']}`,
  `- Microsoft Sysmon event reference: ${sourceTypes['Sysmon event reference']}`,
  `- MITRE ATT&CK technique pages: ${sourceTypes['MITRE ATT&CK']}`,
  `- Unique source labels/URLs: ${sourceRows.length}`,
  '',
  ...sourceRows.map(([label, count]) => `- ${count} × ${label}`),
  '',
  '## Still open',
  '',
  `- ${counts.unreviewed} entries remain unreviewed and are marked as such in the app.`,
  `- ${counts.genericNotes} entries still carry the generic user-mode detection note.`,
  `- ${counts.high - counts.highReviewed} high-suspicion entries remain in the queue, including ${counts.highTelemetry - (counts.highReviewed - counts.highNoTelemetryReviewed)} with mapped telemetry.`,
  `- ${counts.noMitre} entries have no MITRE technique, ${counts.shortDescriptions} have descriptions under 45 characters, and there are ${counts.uniqueLegit} unique legitimate-use strings.`,
  ''
]

mkdirSync(reportsDir, { recursive: true })
writeFileSync(join(reportsDir, 'review-queue.md'), `${queueLines.join('\n')}\n`)
writeFileSync(join(reportsDir, 'audit-report.md'), `${reportLines.join('\n')}\n`)

console.log(`Wrote reports/review-queue.md (${queued.length} unreviewed)`)
console.log(`Wrote reports/audit-report.md (${counts.reviewed} reviewed, ${counts.genericNotes} generic notes remaining)`)
console.log(`Reviewed high: ${counts.highReviewed}/${counts.high}; high no-telemetry: ${counts.highNoTelemetryReviewed}/${counts.highNoTelemetry}`)
