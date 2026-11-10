/**
 * View layer. Everything is built with createElement + textContent, so API data
 * can never inject markup. No innerHTML is used anywhere in this file.
 */

import { SUSPICION_LABEL, tokenize } from './state.js'
import { mitreUrl } from './data.js'

const ROW_HEIGHT = 84
const OVERSCAN = 4
const GITHUB_NEW_ISSUE_URL = 'https://github.com/sameralyaghn/winapi-atlas/issues/new'

/* ------------------------------------------------------------------ */
/* Tiny DOM helpers                                                     */
/* ------------------------------------------------------------------ */

export function h(tag, props = {}, children = []) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue
    if (key === 'class') node.className = value
    else if (key === 'text') node.textContent = value
    else if (key === 'dataset') Object.assign(node.dataset, value)
    else if (key === 'style') {
      for (const [prop, val] of Object.entries(value)) node.style.setProperty(prop, val)
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value)
    } else if (key === 'value') node.value = value
    else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'readOnly') node[key] = Boolean(value)
    else node.setAttribute(key, String(value))
  }
  append(node, children)
  return node
}

function append(node, children) {
  const list = Array.isArray(children) ? children : [children]
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue
    if (Array.isArray(child)) append(node, child)
    else if (child instanceof Node) node.appendChild(child)
    else node.appendChild(document.createTextNode(String(child)))
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
}

/** Builds a text fragment with <mark> around query hits (safe, no HTML). */
export function highlight(text, tokens) {
  const fragment = document.createDocumentFragment()
  const source = String(text || '')
  const terms = (tokens || []).filter((token) => token.length > 1).sort((a, b) => b.length - a.length)
  if (!terms.length) {
    fragment.appendChild(document.createTextNode(source))
    return fragment
  }
  const pattern = new RegExp(terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi')
  let lastIndex = 0
  for (const match of source.matchAll(pattern)) {
    if (match.index > lastIndex) fragment.appendChild(document.createTextNode(source.slice(lastIndex, match.index)))
    fragment.appendChild(h('mark', { text: match[0] }))
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < source.length) fragment.appendChild(document.createTextNode(source.slice(lastIndex)))
  return fragment
}

export function suspicionBadge(level) {
  return h('span', {
    class: 'badge badge-susp',
    dataset: { level },
    text: SUSPICION_LABEL[level] || level,
    title: `Suspicion: ${SUSPICION_LABEL[level] || level}`
  })
}

/** Copies text to the clipboard with a textarea fallback. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = h('textarea', { class: 'visually-hidden', 'aria-hidden': 'true' })
    area.value = text
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

function externalLink(href, text, className) {
  return h('a', { class: className, href, target: '_blank', rel: 'noopener noreferrer', text })
}

/* ------------------------------------------------------------------ */
/* Catalog columns                                                      */
/* ------------------------------------------------------------------ */

export class CatalogView {
  constructor(root, { onRowClick }) {
    this.root = root
    this.onRowClick = onRowClick
    this.columns = new Map()
    this.selectionKey = ''
    this.resizeTimer = 0
    this.handleResize = () => {
      window.clearTimeout(this.resizeTimer)
      this.resizeTimer = window.setTimeout(() => {
        for (const column of this.columns.values()) this.updateWindow(column, true)
      }, 100)
    }
    window.addEventListener('resize', this.handleResize)
  }

  setCategories(categories) {
    clear(this.root)
    this.columns.clear()
    this.categories = categories
    for (const category of categories) this.root.appendChild(this.buildColumn(category))
  }

  buildColumn(category) {
    const countEl = h('span', { class: 'catcol-count', text: '0' })
    const infoBtn = h('button', {
      class: 'info-btn',
      type: 'button',
      'aria-label': `About the ${category.title} category`,
      'aria-describedby': `cat-tip-${category.id}`,
      text: '?'
    })
    const header = h('header', { class: 'catcol-head' }, [
      h('div', { class: 'catcol-titles' }, [
        h('span', { class: 'cat-dot', 'aria-hidden': 'true' }),
        h('h3', { class: 'catcol-title', id: `cat-title-${category.id}`, text: category.title }),
        countEl,
        infoBtn
      ]),
      h('p', { class: 'cat-tip', id: `cat-tip-${category.id}`, role: 'tooltip', text: category.explanation }),
      h('p', { class: 'catcol-sub', text: category.description })
    ])

    const inner = h('div', { class: 'list-inner' })
    const list = h('div', {
      class: 'catcol-list',
      role: 'list',
      tabindex: '0',
      'aria-labelledby': `cat-title-${category.id}`
    }, inner)

    const section = h('section', {
      class: 'catcol',
      'aria-labelledby': `cat-title-${category.id}`,
      dataset: { cat: category.id }
    }, [header, list])
    section.style.setProperty('--cat', category.color)

    const column = {
      category,
      section,
      list,
      inner,
      countEl,
      rows: [],
      start: -1,
      end: -1,
      selectionKey: '',
      frame: 0
    }

    list.addEventListener('scroll', () => {
      if (column.frame) return
      // A short timer coalesces scroll events and, unlike rAF, still runs when
      // the tab is backgrounded or inside an embedded webview.
      column.frame = window.setTimeout(() => {
        column.frame = 0
        this.updateWindow(column, false)
      }, 16)
    })

    this.columns.set(category.id, column)
    return section
  }

  /** Renders filtered groups for the current state. */
  render(state, groups) {
    const visible = new Set(state.categories.length ? state.categories : this.categories.map((cat) => cat.id))
    this.currentSelection = state.selection
    this.tokens = tokenize(state.query)
    this.selectionKey = [...state.selection].sort().join('|')

    for (const [id, column] of this.columns) {
      const rows = groups.get(id) || []
      const isVisible = visible.has(id)
      column.section.hidden = !isVisible
      column.rows = rows
      column.countEl.textContent = String(rows.length)
      column.inner.style.height = `${rows.length * ROW_HEIGHT}px`
      column.list.setAttribute('aria-label', `${this.labelFor(id)}: ${rows.length} APIs`)
      if (isVisible) this.updateWindow(column, true)
    }
  }

  labelFor(id) {
    const category = this.columns.get(id)
    return category ? category.category.title : id
  }

  setActiveCategory(id) {
    for (const [catId, column] of this.columns) {
      column.section.dataset.active = String(catId === id)
    }
  }

  updateWindow(column, force) {
    if (column.section.hidden) return
    const rows = column.rows
    const viewport = column.list.clientHeight || 480
    const start = Math.max(0, Math.floor(column.list.scrollTop / ROW_HEIGHT) - OVERSCAN)
    const end = Math.min(rows.length, Math.ceil((column.list.scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN)
    if (!force && start === column.start && end === column.end && column.selectionKey === this.selectionKey) return

    column.start = start
    column.end = end
    column.selectionKey = this.selectionKey
    clear(column.inner)

    const selected = new Set(this.currentSelection || [])
    for (let index = start; index < end; index += 1) {
      const api = rows[index]
      if (!api) continue
      column.inner.appendChild(this.buildRow(api, index, rows.length, selected.has(api.name)))
    }
  }

  buildRow(api, index, total, isSelected) {
    const button = h('button', {
      class: 'apirow',
      type: 'button',
      dataset: { name: api.name },
      'aria-pressed': isSelected ? 'true' : 'false',
      onclick: () => this.onRowClick(api, button)
    }, [
      h('span', { class: 'row-head' }, [
        h('span', { class: 'row-name' }, highlight(api.name, this.tokens || [])),
        h('span', { class: 'row-lib', text: api.library.replace(/\.dll$/i, '') })
      ]),
      h('span', { class: 'row-desc', text: api.description }),
      h('span', { class: 'row-susp', dataset: { level: api.suspicion }, title: `Suspicion: ${SUSPICION_LABEL[api.suspicion] || api.suspicion}`, 'aria-hidden': 'true' })
    ])
    if (isSelected) button.classList.add('selected')
    button.setAttribute('aria-label', `${api.name} (${api.library}, ${api.suspicion} suspicion)`)

    const wrap = h('div', {
      class: 'row-wrap',
      role: 'listitem',
      'aria-setsize': String(total),
      'aria-posinset': String(index + 1)
    }, button)
    wrap.style.setProperty('transform', `translateY(${index * ROW_HEIGHT}px)`)
    wrap.style.setProperty('height', `${ROW_HEIGHT}px`)
    return wrap
  }
}

/* ------------------------------------------------------------------ */
/* Mapping selection panel                                              */
/* ------------------------------------------------------------------ */

export class SelectionPanel {
  constructor(root, { onRemove, onClear, onExport, onOpenApi }) {
    this.root = root
    this.dialogCallbacks = { onRemove, onClear, onExport, onOpenApi }
    this.collapsed = false
    this.build()
  }

  build() {
    clear(this.root)
    this.countEl = h('span', { class: 'sel-count', text: '0' })
    this.scopeEl = h('p', { class: 'sel-scope', text: 'Select APIs to build a mapping.' })
    this.listEl = h('ul', { class: 'sel-list' })
    this.breakdownEl = h('ul', { class: 'breakdown' })
    this.techEl = h('ol', { class: 'techniques' })
    this.clearBtn = h('button', {
      class: 'sel-clear',
      type: 'button',
      text: 'Clear all',
      onclick: () => this.dialogCallbacks.onClear()
    })
    this.clearBtn.hidden = true
    this.toggleBtn = h('button', {
      class: 'sel-toggle',
      type: 'button',
      'aria-expanded': 'true',
      'aria-controls': 'sel-body',
      text: 'Collapse',
      onclick: () => {
        this.collapsed = !this.collapsed
        this.root.dataset.collapsed = String(this.collapsed)
        this.toggleBtn.textContent = this.collapsed ? 'Expand' : 'Collapse'
        this.toggleBtn.setAttribute('aria-expanded', String(!this.collapsed))
      }
    })

    const head = h('header', { class: 'sel-head' }, [
      h('h2', { class: 'sel-title', text: 'Mapping selection' }),
      this.countEl,
      this.clearBtn,
      this.toggleBtn
    ])

    const body = h('div', { class: 'sel-body', id: 'sel-body' }, [
      this.scopeEl,
      this.listEl,
      h('h3', { class: 'sel-subtitle', text: 'Per-category breakdown' }),
      this.breakdownEl,
      h('h3', { class: 'sel-subtitle', text: 'Technique inference' }),
      this.techEl,
      this.buildExports()
    ])

    this.root.append(head, body)
  }

  buildExports() {
    const formats = [
      ['csv', 'CSV'],
      ['json', 'JSON'],
      ['markdown', 'Markdown'],
      ['sigma', 'Sigma hints']
    ]
    this.exportNote = h('p', { class: 'export-note', text: 'Exports use the selection when one exists.' })
    return h('div', { class: 'export-block' }, [
      h('h3', { class: 'sel-subtitle', text: 'Export' }),
      h('div', { class: 'export-row' }, formats.map(([format, label]) =>
        h('button', {
          class: 'export-btn',
          type: 'button',
          text: label,
          onclick: () => this.dialogCallbacks.onExport(format)
        })
      )),
      this.exportNote
    ])
  }

  update({ selectedApis, breakdown, matches, scopeLabel }) {
    this.countEl.textContent = String(selectedApis.length)
    this.clearBtn.hidden = selectedApis.length === 0
    this.scopeEl.textContent = scopeLabel

    clear(this.listEl)
    if (!selectedApis.length) {
      this.listEl.appendChild(h('li', { class: 'sel-empty', text: 'Turn on Mapping Mode and click APIs to add them here.' }))
    }
    selectedApis.forEach((api) => {
      const remove = h('button', {
        class: 'chip-x',
        type: 'button',
        'aria-label': `Remove ${api.name} from selection`,
        text: '×',
        onclick: () => this.dialogCallbacks.onRemove(api.name)
      })
      const open = h('button', {
        class: 'sel-chip-open',
        type: 'button',
        text: api.name,
        onclick: () => this.dialogCallbacks.onOpenApi(api.name)
      })
      this.listEl.appendChild(h('li', { class: 'sel-chip' }, [open, remove]))
    })

    clear(this.breakdownEl)
    if (!breakdown.categories.length) {
      this.breakdownEl.appendChild(h('li', { class: 'sel-empty', text: 'No categories yet.' }))
    }
    for (const entry of breakdown.categories) {
      this.breakdownEl.appendChild(h('li', { class: 'breakdown-item' }, [
        h('span', { class: 'breakdown-name', text: entry.title }),
        h('span', { class: 'breakdown-count', text: String(entry.count) })
      ]))
    }

    clear(this.techEl)
    if (!matches.length) {
      this.techEl.appendChild(h('li', { class: 'sel-empty', text: 'Add more APIs to match known technique chains.' }))
    }
    for (const match of matches.slice(0, 8)) {
      this.techEl.appendChild(this.buildTechnique(match))
    }
    if (matches.length > 8) {
      this.techEl.appendChild(h('li', { class: 'sel-empty', text: `+${matches.length - 8} more weaker matches` }))
    }
  }

  buildTechnique(match) {
    const preset = match.preset
    const percent = `${match.score}%`
    return h('li', { class: 'tech' }, [
      h('div', { class: 'tech-head' }, [
        h('span', { class: 'tech-title', text: preset.title }),
        h('span', { class: 'tech-score', text: percent })
      ]),
      h('div', {
        class: 'score-bar',
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(match.score),
        'aria-label': `${preset.title} match`
      }, h('span', { class: 'score-fill', style: { width: percent } })),
      h('div', { class: 'tech-meta' }, [
        externalLink(mitreUrl(preset.mitre.id), `${preset.mitre.id} ${preset.mitre.name}`, 'tech-mitre'),
        h('span', { class: 'tech-complete', text: match.complete ? 'Required chain complete' : `${match.matchedRequired.length}/${preset.required.length} required` })
      ]),
      match.missingRequired.length
        ? h('p', { class: 'tech-missing', text: `Missing: ${match.missingRequired.join(', ')}` })
        : null,
      h('details', { class: 'tech-details' }, [
        h('summary', { text: 'Defender note' }),
        h('p', { class: 'tech-note', text: preset.defender_note })
      ])
    ])
  }
}

/* ------------------------------------------------------------------ */
/* API detail dialog                                                    */
/* ------------------------------------------------------------------ */

export class ApiDialog {
  constructor({ onNavigate, onToggleSelection, getSelected, getShareUrl, getVariants, getNative, onClose }) {
    this.onNavigate = onNavigate
    this.onToggleSelection = onToggleSelection
    this.getSelected = getSelected
    this.getShareUrl = getShareUrl
    this.getVariants = getVariants
    this.getNative = getNative
    this.onClose = onClose
    this.current = null
    this.wasOpen = false

    this.titleEl = h('h2', { class: 'dialog-title', id: 'api-dialog-title', text: '' })
    this.metaEl = h('div', { class: 'dialog-meta' })
    this.bodyEl = h('div', { class: 'dialog-body' })
    this.selectBtn = h('button', { class: 'btn btn-primary', type: 'button', text: 'Add to mapping', onclick: () => this.toggleSelection() })
    this.statusEl = h('p', { class: 'copy-status', role: 'status', 'aria-live': 'polite' })

    this.dialog = h('dialog', { class: 'dialog', id: 'api-dialog', 'aria-labelledby': 'api-dialog-title' }, [
      h('div', { class: 'dialog-shell' }, [
        h('header', { class: 'dialog-head' }, [
          this.titleEl,
          h('button', { class: 'dialog-close', type: 'button', 'aria-label': 'Close API details', text: '×', onclick: () => this.close() })
        ]),
        this.metaEl,
        this.bodyEl,
        h('footer', { class: 'dialog-foot' }, [
          this.selectBtn,
          h('button', { class: 'btn', type: 'button', text: 'Copy JSON', onclick: () => this.copyAs('json') }),
          h('button', { class: 'btn', type: 'button', text: 'Copy Markdown', onclick: () => this.copyAs('markdown') }),
          h('button', { class: 'btn', type: 'button', text: 'Copy Link', onclick: () => this.copyLink() }),
          this.statusEl
        ])
      ])
    ])

    // Chromium's dialog close event is asynchronous and is missing in some
    // embedded webviews, so every dismissal path calls notifyClosed() directly.
    this.dialog.addEventListener('close', () => this.notifyClosed())
    this.dialog.addEventListener('cancel', () => this.notifyClosed())
    // Some embedded webviews never dispatch cancel, so handle Escape directly.
    this.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
      }
    })
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.close()
    })
    document.body.appendChild(this.dialog)
  }

  notifyClosed() {
    if (!this.wasOpen) return
    this.wasOpen = false
    this.current = null
    if (this.onClose) this.onClose()
  }

  open(api) {
    this.current = api
    this.wasOpen = true
    this.statusEl.textContent = ''
    this.titleEl.textContent = api.name
    this.dialog.setAttribute('aria-label', `${api.name} details`)
    clear(this.metaEl)
    this.metaEl.append(
      suspicionBadge(api.suspicion),
      h('span', { class: 'meta-item', text: api.library }),
      h('span', { class: api.verified ? 'meta-item text-green' : 'meta-item text-red', text: api.verified ? 'Verified entry' : 'Unverified entry' }),
      ...(api.aliases.length ? [h('span', { class: 'meta-item', text: `Aliases: ${api.aliases.join(', ')}` })] : [])
    )
    this.buildBody(api)
    this.updateSelectButton()
    if (!this.dialog.open) this.dialog.showModal()
  }

  updateSelectButton() {
    const selected = this.getSelected()
    const isSelected = this.current && selected.includes(this.current.name)
    this.selectBtn.textContent = isSelected ? 'Remove from mapping' : 'Add to mapping'
  }

  toggleSelection() {
    if (!this.current) return
    this.onToggleSelection(this.current.name)
    this.updateSelectButton()
  }

  close() {
    if (this.dialog.open) this.dialog.close()
    this.notifyClosed()
  }

  async copyLink() {
    const url = this.getShareUrl ? this.getShareUrl() : location.href
    const ok = await copyText(url)
    this.statusEl.textContent = ok ? 'Deep link copied to clipboard.' : 'Copy failed — copy the address bar instead.'
  }

  async copyAs(format) {
    if (!this.current) return
    const api = this.current
    const text = format === 'json'
      ? JSON.stringify(api, null, 2)
      : `### ${api.name}\n\n- **Library:** ${api.library}\n- **Suspicion:** ${api.suspicion}\n- **Categories:** ${api.categories.join(', ')}\n- **MITRE:** ${api.mitre.map((tech) => `${tech.id} ${tech.name}`).join(', ') || 'n/a'}\n- **Docs:** ${api.docs}\n\n${api.description}\n\n**Detection.** ${api.detection?.summary || ''}\n\n**Legitimate use.** ${api.legit_use || ''}\n`
    const ok = await copyText(text)
    this.statusEl.textContent = ok ? `Copied ${format.toUpperCase()} to clipboard.` : 'Copy failed — select the text manually.'
  }

  buildBody(api) {
    clear(this.bodyEl)

    this.bodyEl.appendChild(h('p', { class: 'dialog-desc', text: api.description }))

    const variants = this.getVariants ? this.getVariants(api) : []
    const native = this.getNative ? this.getNative(api) : null
    if (variants.length || native) {
      const navigateChip = (name) => h('button', {
        class: 'chip chip-btn',
        type: 'button',
        text: name,
        onclick: () => this.onNavigate(name)
      })
      this.bodyEl.appendChild(h('section', { class: 'dialog-section' }, [
        h('h3', { text: 'Variants & native API' }),
        variants.length
          ? h('div', { class: 'variant-row' }, [
              h('span', { class: 'variant-label', text: 'Character set / extended' }),
              h('div', { class: 'chip-list' }, variants.map((variant) => navigateChip(variant.name)))
            ])
          : null,
        native
          ? h('div', { class: 'variant-row' }, [
              h('span', { class: 'variant-label', text: 'Native counterpart' }),
              h('div', { class: 'chip-list' }, [navigateChip(native.name)]),
              h('span', { class: 'variant-note', text: 'ntdll.dll — the Win32 wrapper usually forwards here.' })
            ])
          : null
      ]))
    }

    this.bodyEl.appendChild(h('section', { class: 'dialog-section' }, [
      h('h3', { text: 'Detection' }),
      h('p', { text: api.detection?.summary || 'No detection summary recorded.' }),
      api.detection?.sysmon_events?.length
        ? h('p', {}, [h('strong', { text: 'Sysmon events: ' }), api.detection.sysmon_events.join(', ')])
        : null,
      api.detection?.etw_providers?.length
        ? h('p', {}, [h('strong', { text: 'ETW providers: ' }), api.detection.etw_providers.join(', ')])
        : null,
      api.detection?.notes ? h('p', { class: 'muted', text: api.detection.notes }) : null
    ]))

    this.bodyEl.appendChild(h('section', { class: 'dialog-section' }, [
      h('h3', { text: 'Mapping' }),
      h('div', { class: 'chip-list' }, api.categories.map((id) =>
        h('span', { class: 'chip', dataset: { cat: id }, text: id })
      )),
      api.mitre.length
        ? h('ul', { class: 'link-list' }, api.mitre.map((tech) =>
            h('li', {}, externalLink(mitreUrl(tech.id), `${tech.id} ${tech.name}`))
          ))
        : h('p', { class: 'muted', text: 'No MITRE ATT&CK technique recorded.' })
    ]))

    this.bodyEl.appendChild(h('section', { class: 'dialog-section' }, [
      h('h3', { text: 'Legitimate use' }),
      h('p', { text: api.legit_use || 'Not recorded.' })
    ]))

    if (api.related.length) {
      this.bodyEl.appendChild(h('section', { class: 'dialog-section' }, [
        h('h3', { text: 'Related APIs' }),
        h('div', { class: 'chip-list' }, api.related.map((name) =>
          h('button', {
            class: 'chip chip-btn',
            type: 'button',
            text: name,
            onclick: () => this.onNavigate(name)
          })
        ))
      ]))
    }

    this.bodyEl.appendChild(h('p', { class: 'dialog-docs' }, [
      externalLink(api.docs, 'Microsoft Learn documentation', 'text-link')
    ]))
  }
}

/* ------------------------------------------------------------------ */
/* Contribute dialog                                                    */
/* ------------------------------------------------------------------ */

const CONTRIBUTE_FIELDS = [
  ['name', 'API name', 'text', 'e.g. VirtualAllocEx2'],
  ['library', 'Library (DLL)', 'text', 'Kernel32.dll'],
  ['description', 'Description', 'textarea', 'One or two sentences describing what the API does.'],
  ['docs', 'Microsoft Learn URL', 'url', 'https://learn.microsoft.com/...'],
  ['legit_use', 'Legitimate use', 'text', 'Who uses this API for legitimate purposes?'],
  ['related', 'Related APIs (comma separated)', 'text', 'OpenProcess, ReadProcessMemory']
]

const CONTRIBUTE_MITRE_HELP = 'One per line: T1055 | Process Injection'
const DEFAULT_DETECTION_SUMMARY = 'Describe what an analyst should look for.'

function splitList(value) {
  return String(value || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseSysmonEvents(value) {
  return splitList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0 && item <= 255)
}

function parseMitreLines(value) {
  const techniques = []
  const invalid = []
  for (const line of String(value || '').split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    const match = text.match(/^(T\d{4}(?:\.\d{3})?)(?:\s*[|:-]\s*|\s+)(.+)$/i)
    if (!match || !match[2].trim()) {
      invalid.push(text)
      continue
    }
    techniques.push({ id: match[1].toUpperCase(), name: match[2].trim() })
  }
  return { techniques, invalid }
}

function formatMitreLines(mitre) {
  return (mitre || []).map((tech) => `${tech.id} | ${tech.name}`).join('\n')
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

export function buildGithubIssueUrl(title, body) {
  return `${GITHUB_NEW_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

function comparisonValue(key, value) {
  if (Array.isArray(value)) {
    if (key === 'categories' || key === 'related' || key === 'aliases') return [...value].sort()
    if (key === 'mitre') {
      return value
        .map((tech) => ({ id: tech.id, name: tech.name }))
        .sort((a, b) => a.id.localeCompare(b.id))
    }
  }
  if (key === 'detection' && value && typeof value === 'object') {
    return {
      ...value,
      sysmon_events: Array.isArray(value.sysmon_events) ? [...value.sysmon_events].sort((a, b) => a - b) : value.sysmon_events,
      etw_providers: Array.isArray(value.etw_providers) ? [...value.etw_providers].sort() : value.etw_providers
    }
  }
  return value
}

function changedFieldNames(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  return [...keys]
    .filter((key) => JSON.stringify(comparisonValue(key, before?.[key])) !== JSON.stringify(comparisonValue(key, after?.[key])))
    .sort()
}

export class ContributeDialog {
  constructor({ categories, apis = [] }) {
    this.categories = categories
    this.apis = [...apis].sort((a, b) => a.name.localeCompare(b.name))
    this.apiByName = new Map(this.apis.map((api) => [api.name, api]))
    this.mode = 'add'
    this.selectedApi = null
    this.changedFields = []
    this.invalidMitreLines = []
    this.existingMatches = []
    this.existingActiveIndex = -1
    this.categoryBoxes = new Map()
    this.statusEl = h('p', { class: 'copy-status', role: 'status', 'aria-live': 'polite' })
    this.preview = h('textarea', { class: 'snippet', readonly: true, rows: '14', 'aria-label': 'Generated JSON snippet' })
    this.body = h('div', { class: 'dialog-body' })
    this.build()
  }

  build() {
    this.inputs = new Map()
    const fields = CONTRIBUTE_FIELDS.map(([key, label, type, placeholder]) => {
      const input = type === 'textarea'
        ? h('textarea', { id: `cf-${key}`, rows: '3', placeholder })
        : h('input', { id: `cf-${key}`, type, placeholder, autocomplete: 'off' })
      this.inputs.set(key, input)
      return h('div', { class: 'field' }, [h('label', { for: `cf-${key}`, text: label }), input])
    })

    this.existingInput = h('input', {
      id: 'cf-existing-api',
      type: 'search',
      placeholder: 'Search by name, DLL or description…',
      autocomplete: 'off',
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': 'false',
      'aria-controls': 'cf-api-results',
      'aria-haspopup': 'listbox'
    })
    this.existingResults = h('div', {
      class: 'api-combobox-results',
      id: 'cf-api-results',
      role: 'listbox',
      'aria-label': 'Matching APIs',
      hidden: true
    })
    this.existingHint = h('p', { class: 'field-hint', text: 'Type to search 721 APIs. Use ↑ ↓ and Enter to choose.' })
    this.existingInput.addEventListener('input', () => this.handleExistingInput())
    this.existingInput.addEventListener('focus', () => this.openExistingResults())
    this.existingInput.addEventListener('focusout', (event) => {
      if (event.relatedTarget && this.existingField.contains(event.relatedTarget)) return
      window.setTimeout(() => {
        if (!this.existingField.contains(document.activeElement)) this.closeExistingResults()
      }, 0)
    })
    this.existingInput.addEventListener('keydown', (event) => this.handleExistingKeydown(event))
    this.existingInput.addEventListener('change', () => {
      if (this.trySelectExisting()) this.closeExistingResults()
    })
    this.existingField = h('div', { class: 'field field-full existing-api-field is-hidden' }, [
      h('label', { for: 'cf-existing-api', text: 'Existing API to modify' }),
      h('div', { class: 'api-combobox' }, [
        h('span', { class: 'api-combobox-icon', 'aria-hidden': 'true' }),
        this.existingInput,
        this.existingResults
      ]),
      this.existingHint
    ])

    const catGrid = h('div', { class: 'checkgrid' }, this.categories.map((category) => {
      const box = h('input', { type: 'checkbox', value: category.id, id: `cf-cat-${category.id}` })
      this.categoryBoxes.set(category.id, box)
      return h('label', { class: 'check', for: `cf-cat-${category.id}` }, [box, h('span', { text: category.title })])
    }))

    const suspicion = h('select', { id: 'cf-suspicion' }, [
      h('option', { value: 'low', text: 'low' }),
      h('option', { value: 'medium', text: 'medium' }),
      h('option', { value: 'high', text: 'high' })
    ])
    suspicion.value = 'medium'
    this.inputs.set('suspicion', suspicion)

    const mitre = h('textarea', { id: 'cf-mitre', rows: '3', placeholder: CONTRIBUTE_MITRE_HELP })
    this.inputs.set('mitre', mitre)

    const detectionSummary = h('textarea', { id: 'cf-detection-summary', rows: '3', placeholder: 'What should an analyst look for?' })
    const detectionSysmon = h('input', { id: 'cf-detection-sysmon', type: 'text', placeholder: '1, 3, 11' })
    const detectionEtw = h('input', { id: 'cf-detection-etw', type: 'text', placeholder: 'Microsoft-Windows-Kernel-Network' })
    const detectionNotes = h('textarea', { id: 'cf-detection-notes', rows: '3', placeholder: 'Telemetry caveats, event semantics or correlation advice.' })
    this.inputs.set('detection_summary', detectionSummary)
    this.inputs.set('detection_sysmon', detectionSysmon)
    this.inputs.set('detection_etw', detectionEtw)
    this.inputs.set('detection_notes', detectionNotes)
    this.verifiedBox = h('input', { type: 'checkbox', id: 'cf-verified' })
    this.notesInput = h('textarea', { id: 'cf-notes', rows: '3', placeholder: 'Why is this correction needed? Add context or a source.' })
    this.inputs.set('notes', this.notesInput)
    this.notesField = h('div', { class: 'field field-full is-hidden' }, [
      h('label', { for: 'cf-notes', text: 'Correction notes (optional)' }),
      this.notesInput
    ])

    this.addModeBtn = h('button', {
      class: 'mode-btn is-active',
      type: 'button',
      'aria-pressed': 'true',
      text: 'Add new API',
      onclick: () => this.setMode('add')
    })
    this.modifyModeBtn = h('button', {
      class: 'mode-btn',
      type: 'button',
      'aria-pressed': 'false',
      text: 'Modify existing API',
      onclick: () => this.setMode('modify')
    })
    this.modeSwitch = h('div', { class: 'mode-switch', role: 'group', 'aria-label': 'Contribution type' }, [
      this.addModeBtn,
      this.modifyModeBtn
    ])

    const form = h('form', { class: 'contribute-form', onsubmit: (event) => event.preventDefault() }, [
      this.modeSwitch,
      this.existingField,
      h('div', { class: 'form-grid' }, fields),
      h('fieldset', { class: 'fieldset' }, [
        h('legend', { text: 'Categories' }),
        catGrid
      ]),
      h('div', { class: 'form-grid form-grid-narrow' }, [
        h('div', { class: 'field' }, [h('label', { for: 'cf-suspicion', text: 'Suspicion' }), suspicion]),
        h('div', { class: 'field field-full' }, [
          h('label', { for: 'cf-mitre', text: 'MITRE techniques' }),
          mitre,
          h('p', { class: 'field-hint', text: CONTRIBUTE_MITRE_HELP })
        ])
      ]),
      h('fieldset', { class: 'fieldset' }, [
        h('legend', { text: 'Detection guidance' }),
        h('div', { class: 'form-grid' }, [
          h('div', { class: 'field field-full' }, [h('label', { for: 'cf-detection-summary', text: 'Detection summary' }), detectionSummary]),
          h('div', { class: 'field' }, [h('label', { for: 'cf-detection-sysmon', text: 'Sysmon event IDs (comma separated)' }), detectionSysmon]),
          h('div', { class: 'field' }, [h('label', { for: 'cf-detection-etw', text: 'ETW providers (comma separated)' }), detectionEtw]),
          h('div', { class: 'field field-full' }, [h('label', { for: 'cf-detection-notes', text: 'Detection notes' }), detectionNotes])
        ])
      ]),
      h('label', { class: 'check check-inline', for: 'cf-verified' }, [
        this.verifiedBox,
        h('span', { text: 'Verified against Microsoft Learn documentation' })
      ]),
      this.notesField
    ])

    this.dialogTitle = h('h2', { class: 'dialog-title', id: 'contribute-title', text: 'Contribute an API' })
    this.intro = h('p', { class: 'muted', text: 'Nothing is uploaded. The form builds a JSON entry you can copy or submit in a prefilled GitHub issue.' })

    this.dialog = h('dialog', { class: 'dialog dialog-wide', id: 'contribute-dialog', 'aria-labelledby': 'contribute-title' }, [
      h('div', { class: 'dialog-shell' }, [
        h('header', { class: 'dialog-head' }, [
          this.dialogTitle,
          h('button', { class: 'dialog-close', type: 'button', 'aria-label': 'Close contribution form', text: '×', onclick: () => this.dialog.close() })
        ]),
        this.intro,
        h('div', { class: 'dialog-body' }, [
          form,
          h('h3', { text: 'Generated entry' }),
          this.preview,
          h('div', { class: 'action-row' }, [
            h('button', { class: 'btn', type: 'button', text: 'Generate preview', onclick: () => this.generate() }),
            h('button', { class: 'btn', type: 'button', text: 'Copy JSON', onclick: () => this.copyJson() }),
            h('button', { class: 'btn btn-primary', type: 'button', text: 'Open GitHub Issue', onclick: () => this.openIssue() })
          ]),
          this.statusEl
        ])
      ])
    ])

    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close()
    })
    this.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.dialog.open) {
        event.preventDefault()
        this.dialog.close()
      }
    })
    document.body.appendChild(this.dialog)
  }

  open() {
    this.dialog.showModal()
    if (this.mode === 'modify') this.existingInput.focus()
    else this.inputs.get('name').focus()
  }

  setMode(mode) {
    if (mode === this.mode) return
    this.mode = mode
    const modifying = mode === 'modify'
    this.addModeBtn.classList.toggle('is-active', !modifying)
    this.modifyModeBtn.classList.toggle('is-active', modifying)
    this.addModeBtn.setAttribute('aria-pressed', String(!modifying))
    this.modifyModeBtn.setAttribute('aria-pressed', String(modifying))
    this.existingField.classList.toggle('is-hidden', !modifying)
    this.notesField.classList.toggle('is-hidden', !modifying)
    this.dialogTitle.textContent = modifying ? 'Modify an existing API' : 'Contribute an API'
    this.intro.textContent = modifying
      ? 'Pick an API from the catalog, edit its fields, then generate a data-correction issue. Nothing is uploaded.'
      : 'Nothing is uploaded. The form builds a JSON entry you can copy or submit in a prefilled GitHub issue.'
    this.resetForm()
    if (modifying) this.existingInput.focus()
    else this.inputs.get('name').focus()
  }

  resetForm() {
    for (const [key, input] of this.inputs) {
      if (input.tagName === 'SELECT') input.value = key === 'suspicion' ? 'medium' : ''
      else if (input.type === 'checkbox') input.checked = false
      else input.value = ''
    }
    for (const box of this.categoryBoxes.values()) box.checked = false
    this.verifiedBox.checked = false
    this.existingInput.value = ''
    this.existingHint.textContent = 'Type to search 721 APIs. Use ↑ ↓ and Enter to choose.'
    this.existingHint.classList.remove('is-selected')
    this.closeExistingResults()
    this.selectedApi = null
    this.changedFields = []
    this.invalidMitreLines = []
    this.preview.value = ''
    this.statusEl.textContent = ''
  }

  handleExistingInput() {
    const previous = this.selectedApi
    const query = this.existingInput.value.trim()

    if (!query) {
      if (previous) this.resetForm()
      this.openExistingResults()
      return
    }

    if (previous && query !== previous.name) {
      this.selectedApi = null
      this.changedFields = []
      this.invalidMitreLines = []
      this.preview.value = ''
      this.existingHint.textContent = 'Type to search 721 APIs. Use ↑ ↓ and Enter to choose.'
      this.existingHint.classList.remove('is-selected')
      this.statusEl.textContent = 'Select an API from the list to continue editing it.'
    }

    this.openExistingResults()
  }

  openExistingResults() {
    if (this.mode !== 'modify') return
    this.existingResults.hidden = false
    this.existingInput.setAttribute('aria-expanded', 'true')
    this.renderExistingResults(this.existingInput.value)
  }

  closeExistingResults() {
    this.existingResults.hidden = true
    this.existingInput.setAttribute('aria-expanded', 'false')
    this.existingInput.removeAttribute('aria-activedescendant')
    this.existingActiveIndex = -1
  }

  renderExistingResults(rawQuery) {
    const query = String(rawQuery || '').trim()
    const needle = query.toLowerCase()
    let matches = this.apis

    if (needle) {
      matches = this.apis
        .filter((api) =>
          api.name.toLowerCase().includes(needle) ||
          (api.library || '').toLowerCase().includes(needle) ||
          (api.description || '').toLowerCase().includes(needle)
        )
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(needle) ? 0 : 1
          const bStarts = b.name.toLowerCase().startsWith(needle) ? 0 : 1
          return aStarts - bStarts || a.name.length - b.name.length || a.name.localeCompare(b.name)
        })
    }

    const total = matches.length
    const visible = matches.slice(0, query ? 60 : 12)
    this.existingMatches = visible
    this.existingActiveIndex = visible.length ? 0 : -1
    clear(this.existingResults)

    this.existingResults.appendChild(h('div', { class: 'api-combobox-meta' }, [
      h('span', { text: query ? `${total} ${total === 1 ? 'match' : 'matches'}` : `${this.apis.length} APIs in catalog` }),
      h('span', { text: query ? 'Enter to select' : 'Type to filter' })
    ]))

    if (!visible.length) {
      this.existingResults.appendChild(h('div', { class: 'api-combobox-empty' }, [
        h('strong', { text: 'No APIs found' }),
        h('span', { text: ` for “${query}”. Try a different name, DLL or keyword.` })
      ]))
      return
    }

    visible.forEach((api, index) => {
      const option = h('button', {
        type: 'button',
        class: 'api-combobox-option',
        role: 'option',
        id: `cf-api-option-${index}`,
        tabindex: '-1',
        'aria-selected': String(index === this.existingActiveIndex),
        onmousedown: (event) => event.preventDefault(),
        onclick: () => this.chooseExistingResult(api)
      }, [
        h('span', { class: 'api-combobox-main' }, [
          h('span', { class: 'api-combobox-name', text: api.name }),
          h('span', { class: 'api-combobox-desc', text: api.description || '' })
        ]),
        h('span', { class: 'api-combobox-lib', text: api.library })
      ])
      if (this.selectedApi && this.selectedApi.name === api.name) option.classList.add('is-selected')
      this.existingResults.appendChild(option)
    })

    if (query && total > visible.length) {
      this.existingResults.appendChild(h('div', { class: 'api-combobox-more', text: `Showing ${visible.length} of ${total} matches — keep typing to narrow the list.` }))
    }

    this.updateActiveExisting()
  }

  updateActiveExisting() {
    const options = [...this.existingResults.querySelectorAll('.api-combobox-option')]
    options.forEach((option, index) => {
      const active = index === this.existingActiveIndex
      option.classList.toggle('is-active', active)
      option.setAttribute('aria-selected', String(active))
      if (active) {
        this.existingInput.setAttribute('aria-activedescendant', option.id)
        option.scrollIntoView({ block: 'nearest' })
      }
    })
    if (this.existingActiveIndex < 0) this.existingInput.removeAttribute('aria-activedescendant')
  }

  handleExistingKeydown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (this.existingResults.hidden) {
        this.openExistingResults()
        return
      }
      if (!this.existingMatches.length) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      this.existingActiveIndex = (this.existingActiveIndex + step + this.existingMatches.length) % this.existingMatches.length
      this.updateActiveExisting()
      return
    }

    if (event.key === 'Enter') {
      if (!this.existingResults.hidden && this.existingActiveIndex >= 0) {
        event.preventDefault()
        this.chooseExistingResult(this.existingMatches[this.existingActiveIndex])
      } else if (this.trySelectExisting()) {
        event.preventDefault()
        this.closeExistingResults()
      }
      return
    }

    if (event.key === 'Escape' && !this.existingResults.hidden) {
      event.preventDefault()
      event.stopPropagation()
      this.closeExistingResults()
      return
    }

    if (event.key === 'Tab') this.closeExistingResults()
  }

  chooseExistingResult(api) {
    this.loadExisting(api)
  }

  trySelectExisting() {
    const api = this.apiByName.get(this.existingInput.value.trim())
    if (!api) return false
    this.loadExisting(api)
    return true
  }

  loadExisting(api) {
    this.selectedApi = api
    this.inputs.get('name').value = api.name
    this.inputs.get('library').value = api.library || ''
    this.inputs.get('description').value = api.description || ''
    this.inputs.get('docs').value = api.docs || ''
    this.inputs.get('legit_use').value = api.legit_use || ''
    this.inputs.get('related').value = (api.related || []).join(', ')
    this.inputs.get('suspicion').value = ['low', 'medium', 'high'].includes(api.suspicion) ? api.suspicion : 'medium'
    this.inputs.get('mitre').value = formatMitreLines(api.mitre)

    for (const [id, box] of this.categoryBoxes) box.checked = (api.categories || []).includes(id)

    const detection = api.detection || {}
    this.inputs.get('detection_summary').value = detection.summary || ''
    this.inputs.get('detection_sysmon').value = (detection.sysmon_events || []).join(', ')
    this.inputs.get('detection_etw').value = (detection.etw_providers || []).join(', ')
    this.inputs.get('detection_notes').value = detection.notes || ''
    this.verifiedBox.checked = api.verified !== false

    this.existingInput.value = api.name
    this.existingHint.textContent = `Selected ${api.name} · ${api.library}`
    this.existingHint.classList.add('is-selected')
    this.closeExistingResults()
    this.notesInput.value = ''
    this.changedFields = []
    this.invalidMitreLines = []
    this.preview.value = ''
    this.statusEl.textContent = `Loaded ${api.name}. Edit any field, then generate the correction.`
  }

  readEntry() {
    const value = (key) => (this.inputs.get(key)?.value || '').trim()
    const selected = this.mode === 'modify' ? this.selectedApi : null
    let categories = [...this.categoryBoxes.entries()].filter(([, box]) => box.checked).map(([id]) => id)
    if (selected) {
      const original = selected.categories || []
      const same = categories.length === original.length && categories.every((id) => original.includes(id))
      if (same) categories = [...original]
    }
    const entry = selected ? cloneJson(selected) : {}
    entry.name = value('name')
    entry.library = value('library')
    entry.description = value('description')
    entry.categories = categories
    entry.suspicion = value('suspicion') || 'medium'
    const mitre = parseMitreLines(value('mitre'))
    this.invalidMitreLines = mitre.invalid
    entry.mitre = mitre.techniques
    entry.docs = value('docs') || (selected && selected.docs) || 'https://learn.microsoft.com/en-us/search/?terms=' + encodeURIComponent(value('name'))

    const detection = selected && selected.detection ? { ...selected.detection } : {}
    detection.summary = value('detection_summary') || DEFAULT_DETECTION_SUMMARY
    detection.sysmon_events = parseSysmonEvents(value('detection_sysmon'))
    detection.etw_providers = splitList(value('detection_etw'))
    if (value('detection_notes')) detection.notes = value('detection_notes')
    else delete detection.notes
    entry.detection = detection

    entry.legit_use = value('legit_use')
    entry.related = splitList(value('related'))
    entry.verified = this.verifiedBox.checked
    if (Array.isArray(entry.aliases) && !entry.aliases.length) delete entry.aliases
    return entry
  }

  generate() {
    if (this.mode === 'modify' && !this.selectedApi) {
      this.statusEl.textContent = 'Select an API from the catalog first.'
      return null
    }
    const entry = this.readEntry()
    const errors = []
    if (!entry.name) errors.push('Name is required.')
    if (!entry.library) errors.push('Library is required.')
    if (!entry.description) errors.push('Description is required.')
    if (!entry.legit_use) errors.push('Legitimate use is required.')
    if (!entry.categories.length) errors.push('Select at least one category.')
    if (this.invalidMitreLines.length) errors.push('MITRE lines must look like “T1055 | Process Injection”.')
    if (!/^https:\/\/learn\.microsoft\.com\/\S+$/.test(entry.docs)) errors.push('Documentation must be a learn.microsoft.com URL.')
    if (errors.length) {
      this.statusEl.textContent = errors.join(' ')
      return null
    }
    this.preview.value = JSON.stringify(entry, null, 2)
    if (this.mode === 'modify' && this.selectedApi) {
      const before = cloneJson(this.selectedApi)
      if (Array.isArray(before.aliases) && !before.aliases.length) delete before.aliases
      this.changedFields = changedFieldNames(before, entry)
    } else {
      this.changedFields = []
    }
    this.statusEl.textContent = this.mode === 'modify'
      ? (this.changedFields.length
          ? `Preview generated. ${this.changedFields.length} changed field(s): ${this.changedFields.join(', ')}.`
          : 'Preview generated. No JSON fields changed yet.')
      : 'Preview generated. Copy the JSON or open a prefilled GitHub issue.'
    return entry
  }

  buildIssue(entry) {
    const modifying = this.mode === 'modify' && this.selectedApi
    const apiName = modifying ? this.selectedApi.name : entry.name
    const json = JSON.stringify(entry, null, 2)
    const title = modifying ? `Data Correction: ${apiName}` : `New API Contribution: ${apiName}`
    const lines = []

    if (modifying) {
      lines.push(`## Data correction: ${apiName}`, '')
      lines.push(`This issue proposes a correction to the existing \`${apiName}\` entry in \`data/apis.json\`.`, '')
      lines.push('### Changed fields', '')
      lines.push(...(this.changedFields.length
        ? this.changedFields.map((field) => `- \`${field}\``)
        : ['- No JSON fields changed; see notes.']), '')
      const notes = this.notesInput.value.trim()
      if (notes) lines.push('### Notes', '', notes, '')
      lines.push('### Updated JSON', '', '```json', json, '```')
    } else {
      lines.push('## New API contribution', '', '### Proposed JSON', '', '```json', json, '```')
    }

    return { title, body: lines.join('\n') }
  }

  openIssue() {
    const entry = this.generate()
    if (!entry) return
    if (this.mode === 'modify' && !this.changedFields.length && !this.notesInput.value.trim()) {
      this.statusEl.textContent = 'Make at least one change before opening a correction issue.'
      return
    }
    const { title, body } = this.buildIssue(entry)
    const url = buildGithubIssueUrl(title, body)
    const newWindow = window.open(url, '_blank')
    if (!newWindow) {
      const message = 'Your browser blocked the GitHub issue tab. Allow pop-ups for this site and try again, or use Copy JSON and paste the entry into a new issue.'
      this.statusEl.textContent = message
      window.alert(message)
      return
    }
    newWindow.opener = null
    this.statusEl.textContent = this.mode === 'modify'
      ? 'Opened a prefilled data-correction issue in a new tab.'
      : 'Opened a prefilled GitHub issue in a new tab.'
  }

  async copyJson() {
    const entry = this.generate()
    if (!entry) return
    const ok = await copyText(this.preview.value)
    this.statusEl.textContent = ok ? 'JSON copied to clipboard.' : 'Copy failed — copy the preview manually.'
  }

}

/* ------------------------------------------------------------------ */
/* Paste imports / quick triage dialog                                  */
/* ------------------------------------------------------------------ */

export class PasteImportsDialog {
  constructor({ onScan }) {
    this.onScan = onScan
    this.input = h('textarea', {
      id: 'paste-input',
      class: 'import-textarea',
      rows: '9',
      spellcheck: 'false',
      autocomplete: 'off',
      placeholder: 'Paste dumpbin /imports output, rabin2 -i, PEStudio export text, an import table or a list of strings…',
      'aria-describedby': 'paste-help'
    })
    this.summaryEl = h('p', { class: 'paste-summary', role: 'status', 'aria-live': 'polite' })
    this.matchesEl = h('div', { class: 'chip-list paste-matches' })
    this.statusEl = h('p', { class: 'copy-status', role: 'status', 'aria-live': 'polite' })
    this.build()
  }

  build() {
    this.dialog = h('dialog', { class: 'dialog dialog-wide', id: 'paste-dialog', 'aria-labelledby': 'paste-title' }, [
      h('div', { class: 'dialog-shell' }, [
        h('header', { class: 'dialog-head' }, [
          h('h2', { class: 'dialog-title', id: 'paste-title', text: 'Paste imports' }),
          h('button', { class: 'dialog-close', type: 'button', 'aria-label': 'Close paste imports dialog', text: '×', onclick: () => this.dialog.close() })
        ]),
        h('div', { class: 'dialog-body' }, [
          h('p', { class: 'muted', id: 'paste-help', text: 'Matching runs locally against the 721-API catalog, including A/W/Ex variants and __imp_/stdcall decorations. Nothing is uploaded.' }),
          h('label', { class: 'visually-hidden', for: 'paste-input', text: 'Pasted import text' }),
          this.input,
          h('div', { class: 'export-row' }, [
            h('button', { class: 'btn btn-primary', type: 'button', text: 'Scan & map', onclick: () => this.scan() }),
            h('button', { class: 'btn', type: 'button', text: 'Clear', onclick: () => this.clear() })
          ]),
          this.summaryEl,
          this.matchesEl,
          this.statusEl
        ])
      ])
    ])

    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close()
    })
    this.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.dialog.open) {
        event.preventDefault()
        this.dialog.close()
      }
    })
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        this.scan()
      }
    })
    document.body.appendChild(this.dialog)
  }

  open() {
    this.dialog.showModal()
    this.input.focus()
  }

  clear() {
    this.input.value = ''
    this.summaryEl.textContent = ''
    this.statusEl.textContent = ''
    clear(this.matchesEl)
    this.input.focus()
  }

  scan() {
    const text = this.input.value
    if (!text.trim()) {
      this.statusEl.textContent = 'Paste some import text first.'
      return
    }
    const result = this.onScan(text)
    clear(this.matchesEl)
    if (!result.names.length) {
      this.summaryEl.textContent = ''
      this.statusEl.textContent = 'No catalog APIs recognised in that text — try raw import names or dumpbin output.'
      return
    }
    this.summaryEl.textContent = result.summary
    const shown = result.names.slice(0, 40)
    for (const name of shown) {
      this.matchesEl.appendChild(h('span', { class: 'chip', text: name }))
    }
    if (result.names.length > shown.length) {
      this.matchesEl.appendChild(h('span', { class: 'chip chip-muted', text: `+${result.names.length - shown.length} more` }))
    }
    this.statusEl.textContent = `Mapped ${result.names.length} APIs. Mapping mode is on — close this dialog to review the selection.`
  }
}
