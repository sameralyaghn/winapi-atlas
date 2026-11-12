/**
 * Application controller: loads data, owns state, wires events, keeps the URL
 * hash in sync and delegates rendering to js/ui.js.
 */

import { loadCatalog, findApi, nativeCounterpart, variantApis } from './data.js'
import { CHAIN_LIMIT, buildChainModel, downloadChainMap, renderChainMap } from './chainmap.js'
import {
  buildCsv,
  buildJson,
  buildMarkdown,
  buildSigmaHints,
  downloadFile,
  exportFilename
} from './export.js'
import {
  activeFilterCount,
  emptyState,
  filterApis,
  groupByCategory,
  matchImportNames,
  matchTechniques,
  parseHash,
  parseQuery,
  sanitizeSelection,
  selectionBreakdown,
  serializeState,
  SUSPICION_LABEL,
  SUSPICION_LEVELS,
  toggleValue,
  visibleCategories
} from './state.js'
import { ApiDialog, CatalogView, ContributeDialog, PasteImportsDialog, SelectionPanel, clear, h } from './ui.js'
import { DOCS_KIND_VALUES, REVIEW_STATUS_VALUES, TELEMETRY_COVERAGE_VALUES } from './schema.js'

const THEME_KEY = 'winapi-atlas-theme'

const dom = {
  columns: document.getElementById('columns'),
  status: document.getElementById('status'),
  search: document.getElementById('search'),
  searchForm: document.getElementById('search-form'),
  mappingToggle: document.getElementById('mapping-toggle'),
  themeToggle: document.getElementById('theme-toggle'),
  libraryFilters: document.getElementById('library-filters'),
  suspicionFilters: document.getElementById('suspicion-filters'),
  categoryFilters: document.getElementById('category-filters'),
  mitreFilter: document.getElementById('mitre-filter'),
  docsFilter: document.getElementById('docs-filter'),
  telemetryFilter: document.getElementById('telemetry-filter'),
  reviewFilter: document.getElementById('review-filter'),
  filterCount: document.getElementById('filter-count'),
  filters: document.getElementById('filters'),
  resetFilters: document.getElementById('reset-filters'),
  tabs: document.getElementById('cat-tabs'),
  panel: document.getElementById('selection-panel'),
  exportScope: document.getElementById('export-scope'),
  about: document.getElementById('about-dialog'),
  pasteBtn: document.getElementById('paste-btn')
}

let data = null
let state = emptyState()
let activeCategory = null
let lastWrittenHash = null

const view = new CatalogView(dom.columns, { onRowClick: handleRowClick })
const panel = new SelectionPanel(dom.panel, {
  onRemove: (name) => update({ selection: state.selection.filter((item) => item !== name) }),
  onClear: () => update({ selection: [], importFilter: false }),
  onExport: (format) => doExport(format),
  onOpenApi: (name) => openApi(name)
})
const apiDialog = new ApiDialog({
  onNavigate: (name) => openApi(name),
  onToggleSelection: (name) => toggleSelection(name),
  getSelected: () => state.selection,
  getShareUrl: () => location.href,
  getVariants: (api) => (data ? variantApis(api, data.byName) : []),
  getNative: (api) => (data ? nativeCounterpart(api.name, data.byName) : null),
  onClose: () => {
    clearApiParam()
    if (!state.api) return
    state = { ...state, api: null }
    syncHash()
  }
})

/* ------------------------------------------------------------------ */
/* Theme                                                                */
/* ------------------------------------------------------------------ */

function storedTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  const targetTheme = theme === 'dark' ? 'light' : 'dark'
  const action = `Switch to ${targetTheme} theme`
  dom.themeToggle.setAttribute('aria-label', action)
  dom.themeToggle.title = action
  dom.themeToggle.innerHTML = theme === 'dark'
    ? '<svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>'
    : '<svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"></path></svg>'
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* storage can be unavailable in private modes */
  }
}

/* ------------------------------------------------------------------ */
/* Filters and controls                                                 */
/* ------------------------------------------------------------------ */

function buildControls() {
  clear(dom.libraryFilters)
  data.libraries.forEach((library, index) => {
    const id = `lib-filter-${index}`
    const box = h('input', {
      type: 'checkbox',
      value: library.name,
      id,
      onchange: () => update({ libraries: checkedValues(dom.libraryFilters) })
    })
    dom.libraryFilters.appendChild(
      h('label', { class: 'check', for: id }, [box, h('span', { text: library.name }), h('span', { class: 'check-count', text: String(library.count) })])
    )
  })

  clear(dom.suspicionFilters)
  for (const level of SUSPICION_LEVELS) {
    const id = `susp-filter-${level}`
    const box = h('input', {
      type: 'checkbox',
      value: level,
      id,
      onchange: () => update({ suspicion: checkedValues(dom.suspicionFilters) })
    })
    dom.suspicionFilters.appendChild(
      h('label', { class: 'check', for: id }, [box, h('span', { text: SUSPICION_LABEL[level] })])
    )
  }

  clear(dom.categoryFilters)
  for (const category of data.categories) {
    const button = h('button', {
      class: 'chip chip-btn',
      type: 'button',
      'aria-pressed': 'false',
      dataset: { cat: category.id },
      text: category.title,
      onclick: () => update({ categories: toggleValue(state.categories, category.id) })
    })
    button.style.setProperty('--cat', category.color)
    dom.categoryFilters.appendChild(button)
  }

  const current = dom.mitreFilter.value
  while (dom.mitreFilter.options.length > 1) dom.mitreFilter.remove(1)
  for (const tech of data.mitreOptions) {
    dom.mitreFilter.appendChild(h('option', { value: tech.id, text: `${tech.id} ${tech.name} (${tech.count})` }))
  }
  dom.mitreFilter.value = current
  dom.mitreFilter.addEventListener('change', () => update({ mitre: dom.mitreFilter.value }))
  dom.docsFilter.addEventListener('change', () => update({ docsKind: dom.docsFilter.value }))
  dom.telemetryFilter.addEventListener('change', () => update({ telemetry: dom.telemetryFilter.value }))
  dom.reviewFilter.addEventListener('change', () => update({ review: dom.reviewFilter.value }))
}

function checkedValues(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((box) => box.value)
}

function syncControls() {
  for (const box of dom.libraryFilters.querySelectorAll('input[type="checkbox"]')) {
    box.checked = state.libraries.includes(box.value)
  }
  for (const box of dom.suspicionFilters.querySelectorAll('input[type="checkbox"]')) {
    box.checked = state.suspicion.includes(box.value)
  }
  for (const chip of dom.categoryFilters.querySelectorAll('.chip')) {
    chip.setAttribute('aria-pressed', String(state.categories.includes(chip.dataset.cat)))
  }
  dom.mitreFilter.value = state.mitre
  dom.docsFilter.value = state.docsKind
  dom.telemetryFilter.value = state.telemetry
  dom.reviewFilter.value = state.review
  if (document.activeElement !== dom.search) dom.search.value = state.query
  const count = activeFilterCount(state)
  dom.filterCount.textContent = String(count)
  dom.filters.dataset.active = String(count > 0)
}

/* ------------------------------------------------------------------ */
/* Rendering                                                            */
/* ------------------------------------------------------------------ */

function render() {
  if (!data) return
  const filtered = filterApis(data.apis, state)
  const groups = groupByCategory(filtered, data.categories)
  const visible = visibleCategories(data.categories, state, groups)

  if (!activeCategory || !visible.some((category) => category.id === activeCategory)) {
    activeCategory = visible[0]?.id || null
  }

  view.render(state, groups, visible)
  view.setEmpty(filtered.length === 0)
  view.setActiveCategory(activeCategory)
  renderTabs(visible, groups)
  syncControls()
  updatePanel(filtered)
  updateStatus(filtered, visible)
  applyMappingStyle()
  syncHash()
}

function renderTabs(visible, groups) {
  clear(dom.tabs)
  dom.tabs.hidden = visible.length === 0
  visible.forEach((category) => {
    const count = (groups.get(category.id) || []).length
    const tab = h('button', {
      class: 'cat-tab',
      type: 'button',
      'aria-selected': String(category.id === activeCategory),
      text: `${category.title} (${count})`,
      onclick: (event) => {
        activeCategory = category.id
        view.setActiveCategory(category.id)
        for (const tab of dom.tabs.querySelectorAll('.cat-tab')) {
          tab.setAttribute('aria-selected', String(tab === event.currentTarget))
        }
      }
    })
    tab.style.setProperty('--cat', category.color)
    dom.tabs.appendChild(tab)
  })
}

function updateStatus(filtered, visible) {
  const shown = visible.length ? filtered.length : 0
  const categoryWord = visible.length === 1 ? 'category' : 'categories'
  let text = `Showing ${shown} of ${data.apis.length} APIs · ${visible.length} ${categoryWord}`
  if (state.selection.length) text += ` · ${state.selection.length} selected`
  if (state.importFilter && state.selection.length) text += ' · paste import filter'
  if (state.query) text += ` · search “${state.query}”`
  dom.status.textContent = text
}

function updatePanel(filtered) {
  const selectionApis = state.selection.map((name) => data.byName.get(name)).filter(Boolean)
  const breakdown = selectionBreakdown(state.selection, data.apis, data.categories)
  const matches = matchTechniques(state.selection, data.presets)
  const scopeLabel = state.selection.length
    ? `${state.selection.length} API${state.selection.length === 1 ? '' : 's'} selected. Exports use this selection.`
    : state.mapping
      ? 'Mapping mode is on — click APIs in any column to add them.'
      : 'Select APIs in Mapping mode to build a mapping.'
  panel.update({ selectedApis: selectionApis, breakdown, matches, scopeLabel })
  dom.panel.hidden = !state.mapping && state.selection.length === 0
  dom.exportScope.textContent = state.selection.length
    ? `Exporting the ${state.selection.length}-API selection.`
    : `Exporting the visible table (${filtered.length} APIs).`
}

function applyMappingStyle() {
  document.body.dataset.mapping = String(state.mapping)
  dom.mappingToggle.setAttribute('aria-pressed', String(state.mapping))
  dom.mappingToggle.classList.toggle('active', state.mapping)
}

/* ------------------------------------------------------------------ */
/* State updates and URL hash                                           */
/* ------------------------------------------------------------------ */

function update(patch) {
  state = { ...state, ...patch }
  render()
}

function syncHash() {
  // The open API lives in ?api= so it stays a clean, crawlable deep link; the
  // hash keeps the rest of the shareable state.
  const hash = serializeState(state.api ? { ...state, api: null } : state)
  if (location.hash === hash) {
    lastWrittenHash = hash
    return
  }
  lastWrittenHash = hash
  const url = hash || location.pathname + location.search
  history.replaceState(null, '', url)
}

/** Adds, moves or removes ?api= without touching the hash state. */
function syncApiParam(name) {
  const url = new URL(location.href)
  const current = url.searchParams.get('api')
  if (name ? current === name : current === null) return
  if (name) url.searchParams.set('api', name)
  else url.searchParams.delete('api')
  history.replaceState(null, '', url.pathname + url.search + url.hash)
}

function clearApiParam() {
  syncApiParam(null)
}

/** Folds ?cat=/?q= landing links into state so they can be hashed and shared. */
function consumeQueryState() {
  const url = new URL(location.href)
  let changed = false
  for (const key of ['cat', 'q']) {
    if (!url.searchParams.has(key)) continue
    url.searchParams.delete(key)
    changed = true
  }
  if (changed) history.replaceState(null, '', url.pathname + url.search + url.hash)
}

function toggleSelection(name) {
  update({ selection: toggleValue(state.selection, name) })
  apiDialog.updateSelectButton()
}

function handleRowClick(api) {
  if (state.mapping) toggleSelection(api.name)
  else openApi(api.name)
}

function openApi(name, { writeHash = true } = {}) {
  const api = findApi(data.byName, name)
  if (!api) {
    dom.status.textContent = `No catalog entry named “${name}”.`
    return
  }
  state = { ...state, api: api.name }
  syncApiParam(api.name)
  apiDialog.open(api)
  if (writeHash) syncHash()
}

/* ------------------------------------------------------------------ */
/* Exports                                                              */
/* ------------------------------------------------------------------ */

function currentExportSet() {
  const selection = state.selection.map((name) => data.byName.get(name)).filter(Boolean)
  if (selection.length) return { apis: selection, scope: 'selection' }
  return { apis: filterApis(data.apis, state), scope: 'catalog' }
}

function doExport(format) {
  if (format === 'png') {
    exportChainMapPng()
    return
  }
  const { apis, scope } = currentExportSet()
  const techniques = matchTechniques(state.selection, data.presets)
  let text = ''
  let extension = 'txt'
  let mime = 'text/plain'
  let label = 'text'

  if (format === 'csv') {
    text = buildCsv(apis)
    extension = 'csv'
    mime = 'text/csv'
    label = 'CSV'
  } else if (format === 'json') {
    text = buildJson(apis, { scope })
    extension = 'json'
    mime = 'application/json'
    label = 'JSON'
  } else if (format === 'markdown') {
    text = buildMarkdown(apis)
    extension = 'md'
    mime = 'text/markdown'
    label = 'Markdown'
  } else {
    text = buildSigmaHints(apis, techniques, data.categories, {
      generatedAt: new Date().toISOString(),
      selection: scope === 'selection'
    })
    extension = 'yml'
    mime = 'text/yaml'
    label = 'Sigma-style hints'
  }

  downloadFile(exportFilename(extension, scope), text, mime)
  dom.status.textContent = `Exported ${apis.length} APIs as ${label}.`
}

/** Renders the selected chain (or a capped visible chain) to a PNG download. */
async function exportChainMapPng() {
  const selected = state.selection.map((name) => data.byName.get(name)).filter(Boolean)
  const visible = filterApis(data.apis, state)
  const apis = selected.length ? selected : visible.slice(0, CHAIN_LIMIT)
  if (!apis.length) {
    dom.status.textContent = 'No matching APIs to draw. Clear the search or filters, or select APIs first.'
    return
  }

  const scope = selected.length ? 'selection' : 'visible'
  const technique = matchTechniques(state.selection, data.presets)
    .find((match) => match.completeOrdered) || null
  const model = buildChainModel(apis, data.categories, {
    technique,
    scope,
    totalVisible: visible.length
  })
  const canvas = document.createElement('canvas')

  try {
    if (document.fonts?.ready) await document.fonts.ready
    renderChainMap(canvas, model)
    await downloadChainMap(canvas)
    dom.status.textContent = scope === 'selection'
      ? `Exported a ${apis.length}-API chain map as PNG.`
      : visible.length > apis.length
        ? `Exported the first ${apis.length} of ${visible.length} visible APIs as a chain map PNG.`
        : `Exported ${apis.length} visible API${apis.length === 1 ? '' : 's'} as a chain map PNG.`
  } catch (error) {
    console.error('Chain map export failed:', error)
    dom.status.textContent = 'Chain map export failed — this browser could not create the PNG.'
  }
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                            */
/* ------------------------------------------------------------------ */

function sanitizeState(candidate) {
  const categoryIds = new Set(data.categories.map((category) => category.id))
  const libraryNames = new Set(data.libraries.map((library) => library.name))
  const mitreIds = new Set(data.mitreOptions.map((tech) => tech.id))
  return {
    ...candidate,
    categories: candidate.categories.filter((id) => categoryIds.has(id)),
    libraries: candidate.libraries.filter((name) => libraryNames.has(name)),
    suspicion: candidate.suspicion.filter((level) => SUSPICION_LEVELS.includes(level)),
    mitre: mitreIds.has(candidate.mitre) ? candidate.mitre : '',
    docsKind: DOCS_KIND_VALUES.includes(candidate.docsKind) ? candidate.docsKind : '',
    telemetry: TELEMETRY_COVERAGE_VALUES.includes(candidate.telemetry) ? candidate.telemetry : '',
    review: REVIEW_STATUS_VALUES.includes(candidate.review) ? candidate.review : '',
    selection: sanitizeSelection(candidate.selection, data.byName),
    api: candidate.api && data.byName.has(candidate.api) ? candidate.api : null,
    mapping: Boolean(candidate.mapping)
  }
}

function showError(error) {
  clear(dom.columns)
  const message = error && error.message ? error.message : String(error)
  dom.columns.appendChild(h('div', { class: 'error-panel', role: 'alert' }, [
    h('h2', { text: 'The catalog could not be loaded' }),
    h('p', { text: message }),
    h('p', { class: 'muted', text: 'Serve the folder over HTTP, for example: python -m http.server 8000 — then open http://localhost:8000.' })
  ]))
  dom.status.textContent = 'Catalog failed to load.'
  console.error('WinAPI Atlas failed to load the catalog:', error)
}

function wireEvents() {
  dom.searchForm.addEventListener('submit', (event) => event.preventDefault())
  // Update synchronously: filtering 700+ entries is cheap and this keeps search
  // working in background tabs where requestAnimationFrame is throttled.
  dom.search.addEventListener('input', () => update({ query: dom.search.value }))
  dom.search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      dom.search.value = ''
      update({ query: '' })
      dom.search.blur()
    }
  })

  dom.mappingToggle.addEventListener('click', () => update({ mapping: !state.mapping }))
  dom.themeToggle.addEventListener('click', () => {
    state = { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    applyTheme(state.theme)
    syncHash()
  })
  dom.resetFilters.addEventListener('click', () => {
    dom.search.value = ''
    update({
      query: '',
      categories: [],
      libraries: [],
      suspicion: [],
      mitre: '',
      docsKind: '',
      telemetry: '',
      review: '',
      importFilter: false
    })
  })

  for (const button of document.querySelectorAll('[data-export]')) {
    button.addEventListener('click', () => doExport(button.dataset.export))
  }

  const openContribute = () => contribute.open()
  document.getElementById('contribute-btn').addEventListener('click', openContribute)
  document.getElementById('footer-contribute').addEventListener('click', openContribute)

  const openAbout = () => dom.about.showModal()
  document.getElementById('about-btn').addEventListener('click', openAbout)
  document.getElementById('footer-about').addEventListener('click', openAbout)

  dom.pasteBtn.addEventListener('click', () => pasteDialog.open())

  for (const closer of dom.about.querySelectorAll('[data-close]')) {
    closer.addEventListener('click', () => dom.about.close())
  }
  dom.about.addEventListener('click', (event) => {
    if (event.target === dom.about) dom.about.close()
  })

  window.addEventListener('hashchange', () => {
    if (location.hash === lastWrittenHash) return
    const parsed = parseHash(location.hash)
    state = sanitizeState({ ...emptyState(state.theme), ...parsed })
    applyTheme(state.theme)
    if (!state.api) apiDialog.close()
    render()
    if (state.api) openApi(state.api, { writeHash: false })
  })

  document.addEventListener('keydown', (event) => {
    const target = event.target
    const typing = target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
    const dialogOpen = Boolean(document.querySelector('dialog[open]'))
    if (event.key === '/' && !typing && !dialogOpen && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      dom.search.focus()
      dom.search.select()
    } else if ((event.key === 'm' || event.key === 'M') && !typing && !dialogOpen && !event.ctrlKey && !event.metaKey && !event.altKey) {
      update({ mapping: !state.mapping })
    }
  })
}

let contribute = null
let pasteDialog = null

/** Scans pasted imports, selects every match and returns a summary string. */
function applyImport(text) {
  const names = matchImportNames(text, data.apis)
  if (!names.length) return { names: [], summary: '' }
  update({ selection: names, mapping: true, importFilter: true })
  const breakdown = selectionBreakdown(names, data.apis, data.categories)
  const top = [...breakdown.categories]
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 3)
    .map((category) => `${category.title} (${category.count})`)
    .join(', ')
  const summary = `Matched ${names.length} APIs across ${breakdown.categories.length} categories · top: ${top}`
  dom.status.textContent = summary
  return { names, summary }
}

async function init() {
  const hashState = parseHash(location.hash)
  const queryState = parseQuery(location.search)
  state = {
    ...emptyState(hashState.theme || storedTheme() || 'dark'),
    ...queryState,
    ...hashState
  }
  applyTheme(state.theme)

  try {
    data = await loadCatalog()
  } catch (error) {
    showError(error)
    return
  }

  state = sanitizeState(state)
  activeCategory = null
  lastWrittenHash = location.hash
  // Drop a stale ?api=Name that no longer exists in the catalog.
  if (!state.api) clearApiParam()
  consumeQueryState()

  view.setCategories(data.categories)
  buildControls()
  contribute = new ContributeDialog({ categories: data.categories, apis: data.apis })
  pasteDialog = new PasteImportsDialog({ onScan: applyImport })
  wireEvents()

  render()
  if (state.api) openApi(state.api, { writeHash: false })
}

init()
