/**
 * Shared, dependency-free SEO helpers.
 *
 * The browser and the static generator use these functions so titles,
 * descriptions and canonical URLs cannot drift apart.
 */

export const SITE_NAME = 'WinAPI Atlas'
export const DEFAULT_SITE_URL = 'https://winapi-atlas.vercel.app'
export const ROOT_TITLE = 'WinAPI Atlas — Windows API Malware Technique Catalog'
export const ROOT_DESCRIPTION =
  'Interactive catalog of 721+ Windows APIs mapped to malware techniques, MITRE ATT&CK, Sysmon Event IDs, and ETW providers for SOC Analysts and Malware Researchers.'

export function normalizeSiteUrl(value = DEFAULT_SITE_URL) {
  const siteUrl = String(value || DEFAULT_SITE_URL).trim()
  return siteUrl.replace(/\/+$/, '')
}

export function rootCanonicalUrl(siteUrl = DEFAULT_SITE_URL) {
  return `${normalizeSiteUrl(siteUrl)}/`
}

export function canonicalApiPath(name) {
  return `/api/${encodeURIComponent(name)}`
}

export function canonicalCategoryPath(id) {
  return `/category/${encodeURIComponent(id)}`
}

export function canonicalApiUrl(siteUrl, name) {
  return `${normalizeSiteUrl(siteUrl)}${canonicalApiPath(name)}`
}

export function canonicalCategoryUrl(siteUrl, id) {
  return `${normalizeSiteUrl(siteUrl)}${canonicalCategoryPath(id)}`
}

/**
 * Maps legacy query-string landing links to their canonical static page.
 * Returning a path lets the app use location.replace before loading the catalog.
 */
export function legacyRedirectTarget(search) {
  if (!search) return null
  let params
  try {
    params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  } catch {
    return null
  }
  const api = (params.get('api') || '').trim()
  if (api) return canonicalApiPath(api)
  const category = (params.get('cat') || '').split(',')[0].trim()
  return category ? canonicalCategoryPath(category) : null
}

export function apiPageTitle(api) {
  return `${api.name} — Windows API Detection & Telemetry | ${SITE_NAME}`
}

export function categoryPageTitle(category) {
  return `${category.title} — Windows API Detection & Telemetry | ${SITE_NAME}`
}

export function apiMetaDescription(api) {
  const description = oneLine(api.description)
  const mitre = (api.mitre || []).map((tech) => tech.id).filter(Boolean).join(', ')
  const parts = [
    `${api.name} (${api.library}): ${description}`,
    mitre ? `MITRE ${mitre}.` : '',
    `Suspicion: ${api.suspicion}.`
  ]
  return truncate(parts.filter(Boolean).join(' '), 160)
}

export function categoryMetaDescription(category, apiCount) {
  const explanation = oneLine(category.explanation) || oneLine(category.description)
  return truncate(
    `${category.title}: ${explanation} Browse ${apiCount} Windows APIs with detection, telemetry and legitimate-use guidance.`,
    160
  )
}

export function apiLastmod(api, generatedAt) {
  return isDate(api.reviewed_at) ? api.reviewed_at : generatedAt
}

export function categoryLastmod(apis, generatedAt) {
  const dates = apis.map((api) => api.reviewed_at).filter(isDate).sort()
  return dates.length ? dates[dates.length - 1] : generatedAt
}

export function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function oneLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function truncate(value, maxLength) {
  const text = oneLine(value)
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength - 1).trimEnd()
  const wordBoundary = cut.lastIndexOf(' ')
  const safeCut = wordBoundary > maxLength * 0.65 ? cut.slice(0, wordBoundary) : cut
  return `${safeCut.trimEnd()}…`
}
