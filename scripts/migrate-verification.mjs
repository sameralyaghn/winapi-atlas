#!/usr/bin/env node
/**
 * One-time, idempotent Phase 1A migration: add verification and telemetry
 * coverage fields to data/apis.json without inventing review evidence.
 *
 * Rules:
 * - docs_kind is direct only when the Microsoft Learn URL path names the API;
 *   otherwise an existing link is related.
 * - telemetry_coverage is indirect when existing Sysmon/ETW mappings exist,
 *   none only when the recorded detection text explicitly says it is not
 *   logged, and unknown otherwise.
 * - reviewed_at stays null and sources stays empty. Those require human review.
 *
 * Usage: node scripts/migrate-verification.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import {
  DOCS_KIND_VALUES,
  TELEMETRY_COVERAGE_VALUES,
  classifyDocsKind,
  classifyTelemetryCoverage
} from '../js/schema.js'

const path = new URL('../data/apis.json', import.meta.url)
const apis = JSON.parse(readFileSync(path, 'utf8'))
let changed = 0

const migrated = apis.map((api) => {
  const next = { ...api }
  if (!DOCS_KIND_VALUES.includes(next.docs_kind)) {
    next.docs_kind = classifyDocsKind(next.name, next.docs)
  }
  if (!TELEMETRY_COVERAGE_VALUES.includes(next.telemetry_coverage)) {
    next.telemetry_coverage = classifyTelemetryCoverage(next.detection)
  }
  if (!Object.prototype.hasOwnProperty.call(next, 'reviewed_at')) next.reviewed_at = null
  if (!Array.isArray(next.sources)) next.sources = []
  if (JSON.stringify(next) !== JSON.stringify(api)) changed += 1
  return next
})

writeFileSync(path, `${JSON.stringify(migrated, null, 2)}\n`)
console.log(`Migrated ${changed} of ${apis.length} API entries.`)
