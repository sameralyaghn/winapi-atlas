/**
 * Verification and telemetry-coverage schema shared by the UI, data loader,
 * validator, migration tooling and tests. Classification helpers only use
 * evidence already present in an entry; they do not infer unrecorded claims.
 */

export const DOCS_KIND_VALUES = ['direct', 'related', 'none']
export const TELEMETRY_COVERAGE_VALUES = ['direct', 'indirect', 'none', 'unknown']
export const REVIEW_STATUS_VALUES = ['reviewed', 'unreviewed']

export const DOCS_KIND_LABEL = {
  direct: 'Direct docs',
  related: 'Related docs',
  none: 'No docs link'
}

export const DOCS_KIND_DESCRIPTION = {
  direct: 'The link points to the Microsoft Learn page for this API.',
  related: 'The link points to a related or general Microsoft Learn page, not a first-party reference for this API.',
  none: 'No documentation link is recorded.'
}

export const TELEMETRY_COVERAGE_LABEL = {
  direct: 'Direct telemetry',
  indirect: 'Indirect telemetry',
  none: 'No native telemetry',
  unknown: 'Telemetry unknown'
}

export const TELEMETRY_COVERAGE_DESCRIPTION = {
  direct: 'A provider reports the API operation itself.',
  indirect: 'Sysmon or ETW exposes related operating-system effects, not the Win32 API call itself.',
  none: 'No practical Sysmon or ETW coverage is recorded; use imports, hooks or behavioural correlation.',
  unknown: 'Telemetry coverage has not been classified yet.'
}

/** True only when a human-review date is recorded. */
export function isReviewed(api) {
  return Boolean(api && typeof api.reviewed_at === 'string' && api.reviewed_at.trim())
}

/**
 * Direct means the URL path names the API. Everything else is related/generic,
 * even when the linked page is useful background material.
 */
export function classifyDocsKind(name, docs) {
  if (!docs) return 'none'
  try {
    const path = new URL(docs).pathname.toLowerCase()
    return path.includes(String(name || '').toLowerCase()) ? 'direct' : 'related'
  } catch {
    return 'none'
  }
}

/**
 * Existing Sysmon/ETW mappings describe OS effects rather than an API call, so
 * they are classified as indirect. A no-event entry is only classified as
 * "none" when its recorded detection text explicitly says it is not logged.
 */
export function classifyTelemetryCoverage(detection = {}) {
  const events = (detection.sysmon_events || []).length + (detection.etw_providers || []).length
  if (events > 0) return 'indirect'
  const text = `${detection.summary || ''} ${detection.notes || ''}`
  if (/no direct Sysmon|not logged directly|no direct .*ETW|not logged by Sysmon|no direct event/i.test(text)) {
    return 'none'
  }
  return 'unknown'
}
