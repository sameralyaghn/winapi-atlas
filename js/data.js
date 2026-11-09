/**
 * Loads the JSON catalog and builds lookup indexes. The UI never hard-codes
 * API facts: everything comes from data/apis.json.
 */

const DATA_FILES = ['apis.json', 'categories.json', 'presets.json']

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Failed to load ${url} (HTTP ${response.status})`)
  return response.json()
}

/** Loads all three data files in parallel. Throws a readable error. */
export async function loadCatalog(base = 'data') {
  const [apis, categories, presets] = await Promise.all(
    DATA_FILES.map((file) => fetchJson(`${base}/${file}`))
  )
  if (!Array.isArray(apis) || !Array.isArray(categories) || !Array.isArray(presets)) {
    throw new Error('Catalog data must be JSON arrays')
  }
  return buildCatalog(apis, categories, presets)
}

/** Indexes a catalog, tolerating missing optional fields. */
export function buildCatalog(apis, categories, presets) {
  const normalized = apis.map((api) => ({
    ...api,
    aliases: api.aliases || [],
    categories: api.categories || [],
    mitre: api.mitre || [],
    related: api.related || [],
    detection: api.detection || {},
    verified: api.verified !== false
  }))

  const byName = new Map(normalized.map((api) => [api.name, api]))

  const libraryCounts = new Map()
  const mitreCounts = new Map()
  for (const api of normalized) {
    libraryCounts.set(api.library, (libraryCounts.get(api.library) || 0) + 1)
    for (const tech of api.mitre) {
      const current = mitreCounts.get(tech.id) || { id: tech.id, name: tech.name, count: 0 }
      current.count += 1
      mitreCounts.set(tech.id, current)
    }
  }

  return {
    apis: normalized,
    categories,
    presets,
    byName,
    libraries: [...libraryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    mitreOptions: [...mitreCounts.values()].sort((a, b) => a.id.localeCompare(b.id)),
    categoryById: new Map(categories.map((category) => [category.id, category]))
  }
}

/** Deep link to the official MITRE ATT&CK page for a technique id. */
export function mitreUrl(id) {
  if (!id) return 'https://attack.mitre.org/techniques/'
  const [base, sub] = String(id).split('.')
  return sub ? `https://attack.mitre.org/techniques/${base}/${sub}/` : `https://attack.mitre.org/techniques/${base}/`
}

/** Safe local text search inside the catalog (used by the detail view). */
export function findApi(byName, name) {
  if (!name) return null
  return byName.get(name) || null
}

/**
 * Win32 entry points and the ntdll native routine they usually end up calling.
 * Only pairs where both ends can be looked up in the catalog are surfaced.
 */
const NATIVE_PAIRS = [
  ['CreateFileA', 'NtCreateFile'],
  ['CreateFileW', 'NtCreateFile'],
  ['CreateFileMappingW', 'NtCreateSection'],
  ['CreateProcessA', 'NtCreateUserProcess'],
  ['CreateProcessW', 'NtCreateUserProcess'],
  ['CreateRemoteThread', 'NtCreateThreadEx'],
  ['CreateRemoteThreadEx', 'NtCreateThreadEx'],
  ['CreateThread', 'NtCreateThreadEx'],
  ['CloseHandle', 'NtClose'],
  ['DeleteFileW', 'NtDeleteFile'],
  ['DuplicateHandle', 'NtDuplicateObject'],
  ['GetProcAddress', 'LdrGetProcedureAddress'],
  ['GetThreadContext', 'NtGetContextThread'],
  ['LoadLibraryA', 'LdrLoadDll'],
  ['LoadLibraryExW', 'LdrLoadDll'],
  ['LoadLibraryW', 'LdrLoadDll'],
  ['MapViewOfFile', 'NtMapViewOfSection'],
  ['OpenProcess', 'NtOpenProcess'],
  ['QueueUserAPC', 'NtQueueApcThread'],
  ['ReadFile', 'NtReadFile'],
  ['ReadProcessMemory', 'NtReadVirtualMemory'],
  ['RegCreateKeyExW', 'NtCreateKey'],
  ['RegDeleteKeyW', 'NtDeleteKey'],
  ['RegOpenKeyExW', 'NtOpenKey'],
  ['RegQueryValueExW', 'NtQueryValueKey'],
  ['RegSetValueExW', 'NtSetValueKey'],
  ['ResumeThread', 'NtResumeThread'],
  ['SetThreadContext', 'NtSetContextThread'],
  ['Sleep', 'NtDelayExecution'],
  ['SuspendThread', 'NtSuspendThread'],
  ['TerminateProcess', 'NtTerminateProcess'],
  ['UnmapViewOfFile', 'NtUnmapViewOfSection'],
  ['VirtualAlloc', 'NtAllocateVirtualMemory'],
  ['VirtualAllocEx', 'NtAllocateVirtualMemory'],
  ['VirtualProtect', 'NtProtectVirtualMemory'],
  ['VirtualProtectEx', 'NtProtectVirtualMemory'],
  ['WriteFile', 'NtWriteFile'],
  ['WriteProcessMemory', 'NtWriteVirtualMemory']
]

const NATIVE_COUNTERPARTS = new Map()
for (const [win32, native] of NATIVE_PAIRS) {
  NATIVE_COUNTERPARTS.set(win32, native)
  if (!NATIVE_COUNTERPARTS.has(native)) NATIVE_COUNTERPARTS.set(native, win32)
}

/** Native API counterpart for an entry, or null when none is catalogued. */
export function nativeCounterpart(name, byName) {
  const target = NATIVE_COUNTERPARTS.get(name)
  return target && byName.has(target) ? byName.get(target) : null
}

/**
 * Validates a locally drafted entry and normalizes it to the same shape as a
 * catalog entry, so the board can render it. Returns null when the required
 * fields (name, library, description, one known category) are missing.
 */
export function normalizeDraftEntry(raw, categories) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name || '').trim()
  const library = String(raw.library || '').trim()
  const description = String(raw.description || '').trim()
  if (!name || !library || !description) return null

  const categoryIds = new Set((categories || []).map((category) => category.id))
  const selected = Array.isArray(raw.categories)
    ? raw.categories.filter((id) => categoryIds.has(id))
    : []
  const uniqueCategories = [...new Set(selected)]
  if (!uniqueCategories.length && categories && categories.length) {
    uniqueCategories.push(categories[0].id)
  }
  if (!uniqueCategories.length) return null

  const mitre = Array.isArray(raw.mitre)
    ? raw.mitre
        .filter((tech) => tech && typeof tech.id === 'string' && tech.id && typeof tech.name === 'string' && tech.name)
        .map((tech) => ({ id: tech.id, name: tech.name }))
    : []

  const detection = raw.detection && typeof raw.detection === 'object' && !Array.isArray(raw.detection)
    ? raw.detection
    : { summary: 'Describe what an analyst should look for.' }

  return {
    name,
    library,
    description,
    categories: uniqueCategories,
    suspicion: ['low', 'medium', 'high'].includes(raw.suspicion) ? raw.suspicion : 'medium',
    mitre,
    docs: typeof raw.docs === 'string' && raw.docs.trim()
      ? raw.docs.trim()
      : `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(name)}`,
    detection,
    legit_use: typeof raw.legit_use === 'string' ? raw.legit_use.trim() : '',
    related: Array.isArray(raw.related)
      ? raw.related.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
      : [],
    verified: false
  }
}

/**
 * A/W/Ex siblings of an entry that also exist in the catalog, sorted so the
 * plain name comes first and character-set variants follow.
 */
export function variantApis(api, byName) {
  let stem = api.name
  if (/[AW]$/.test(stem)) stem = stem.slice(0, -1)
  if (/Ex$/.test(stem)) stem = stem.slice(0, -2)
  if (!stem) return []
  const order = ['', 'A', 'W', 'Ex', 'AEx', 'WEx']
  return order
    .map((suffix) => `${stem}${suffix}`)
    .filter((name) => name !== api.name && byName.has(name))
    .map((name) => byName.get(name))
}
