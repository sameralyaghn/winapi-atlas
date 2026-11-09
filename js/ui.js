/**
 * View layer. Everything is built with createElement + textContent, so API data
 * can never inject markup. No innerHTML is used anywhere in this file.
 */

import { SUSPICION_LABEL, tokenize } from './state.js'
import { mitreUrl } from './data.js'

const ROW_HEIGHT = 84
const OVERSCAN = 4
const GITHUB_REPO_URL = 'https://github.com/sameralyaghn/winapi-atlas'

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

  /**
   * Scrolls the first visible column that contains this entry to its card,
   * briefly highlights it and focuses it so a freshly added draft can be
   * opened right away. Returns false when no column currently shows it.
   */
  revealApi(api) {
    if (!api) return false
    for (const column of this.columns.values()) {
      if (column.section.hidden) continue
      const index = column.rows.indexOf(api)
      if (index < 0) continue
      column.list.scrollTop = Math.max(0, index * ROW_HEIGHT - 16)
      this.updateWindow(column, true)
      const row = [...column.inner.querySelectorAll('.apirow')].find((button) => button.dataset.name === api.name)
      if (!row) continue
      row.classList.add('row-flash')
      row.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      row.focus({ preventScroll: true })
      window.setTimeout(() => row.classList.remove('row-flash'), 2600)
      return true
    }
    return false
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
      h('span', { class: 'meta-item', text: api.verified ? 'Verified entry' : 'Unverified entry' }),
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

function buildIssueText(entry) {
  return [
    '## New API contribution',
    '',
    '```json',
    JSON.stringify(entry, null, 2),
    '```',
    '',
    '### Why this belongs in the catalog',
    '',
    '<!-- Describe the defensive relevance: which technique category it maps to and what telemetry catches it. -->',
    '',
    '### Checklist',
    '',
    '- [ ] I verified the API exists in Microsoft Learn.',
    '- [ ] I did not include exploit or malware code.',
    '- [ ] Detection guidance is behavioural, not a recipe.'
  ].join('\n')
}

export class ContributeDialog {
  constructor({ categories, onTestLive, onClearDrafts, getDraftCount }) {
    this.categories = categories
    this.onTestLive = onTestLive
    this.onClearDrafts = onClearDrafts
    this.getDraftCount = getDraftCount || (() => 0)
    this.categoryBoxes = new Map()
    this.statusEl = h('p', { class: 'copy-status', role: 'status', 'aria-live': 'polite' })
    this.preview = h('textarea', { class: 'snippet', readonly: true, rows: '14', 'aria-label': 'Generated JSON snippet' })
    this.testBtn = h('button', { class: 'btn', type: 'button', text: 'Test Live on Board', onclick: () => this.testLive() })
    this.clearDraftsBtn = h('button', { class: 'btn', type: 'button', text: 'Clear local drafts', onclick: () => this.clearDrafts(), hidden: true })
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

    const mitreId = h('input', { id: 'cf-mitre', type: 'text', placeholder: 'T1055 or T1055.012' })
    const mitreName = h('input', { id: 'cf-mitre-name', type: 'text', placeholder: 'Process Injection' })
    this.inputs.set('mitre_id', mitreId)
    this.inputs.set('mitre_name', mitreName)

    const form = h('form', { class: 'contribute-form', onsubmit: (event) => event.preventDefault() }, [
      h('div', { class: 'form-grid' }, fields),
      h('fieldset', { class: 'fieldset' }, [
        h('legend', { text: 'Categories' }),
        catGrid
      ]),
      h('div', { class: 'form-grid form-grid-narrow' }, [
        h('div', { class: 'field' }, [h('label', { for: 'cf-suspicion', text: 'Suspicion' }), suspicion]),
        h('div', { class: 'field' }, [h('label', { for: 'cf-mitre', text: 'MITRE technique ID' }), mitreId]),
        h('div', { class: 'field' }, [h('label', { for: 'cf-mitre-name', text: 'MITRE technique name' }), mitreName])
      ])
    ])

    this.dialog = h('dialog', { class: 'dialog dialog-wide', id: 'contribute-dialog', 'aria-labelledby': 'contribute-title' }, [
      h('div', { class: 'dialog-shell' }, [
        h('header', { class: 'dialog-head' }, [
          h('h2', { class: 'dialog-title', id: 'contribute-title', text: 'Contribute an API' }),
          h('button', { class: 'dialog-close', type: 'button', 'aria-label': 'Close contribution form', text: '×', onclick: () => this.dialog.close() })
        ]),
        h('p', { class: 'muted', text: 'Nothing is uploaded. The form builds a JSON entry and a prefilled GitHub issue you can copy.' }),
        h('div', { class: 'dialog-body' }, [
          form,
          h('h3', { text: 'Generated entry' }),
          this.preview,
          h('div', { class: 'action-row' }, [
            this.testBtn,
            h('button', { class: 'btn btn-primary', type: 'button', text: 'Open GitHub Issue', onclick: () => this.openIssue() }),
            h('button', { class: 'btn', type: 'button', text: 'Generate preview', onclick: () => this.generate() }),
            h('button', { class: 'btn', type: 'button', text: 'Copy issue text', onclick: () => this.copyIssue() }),
            h('button', { class: 'btn', type: 'button', text: 'Copy JSON', onclick: () => this.copyJson() }),
            h('button', { class: 'btn', type: 'button', text: 'Download JSON', onclick: () => this.download() })
          ]),
          h('div', { class: 'action-row' }, [this.clearDraftsBtn]),
          h('p', { class: 'muted draft-note', text: 'Test Live on Board adds the entry to this browser only (localStorage) so you can inspect its card and detail dialog. Open GitHub Issue only opens a prefilled form — nothing is sent until you submit it.' }),
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
    this.syncDraftState()
    this.dialog.showModal()
    this.inputs.get('name').focus()
  }

  syncDraftState() {
    const count = this.getDraftCount()
    this.clearDraftsBtn.hidden = count === 0
    this.clearDraftsBtn.textContent = `Clear local drafts (${count})`
  }

  readEntry() {
    const value = (key) => (this.inputs.get(key)?.value || '').trim()
    const categories = [...this.categoryBoxes.entries()].filter(([, box]) => box.checked).map(([id]) => id)
    const addEntry = value('docs')
    const entry = {}
    if (value('name')) entry.name = value('name')
    if (value('library')) entry.library = value('library')
    if (value('description')) entry.description = value('description')
    entry.categories = categories
    entry.suspicion = value('suspicion') || 'medium'
    if (value('mitre_id') && value('mitre_name')) entry.mitre = [{ id: value('mitre_id'), name: value('mitre_name') }]
    entry.docs = addEntry || 'https://learn.microsoft.com/en-us/search/?terms=' + encodeURIComponent(value('name'))
    entry.detection = { summary: 'Describe what an analyst should look for.' }
    if (value('legit_use')) entry.legit_use = value('legit_use')
    const related = value('related').split(',').map((item) => item.trim()).filter(Boolean)
    if (related.length) entry.related = related
    entry.verified = false
    return entry
  }

  generate() {
    const entry = this.readEntry()
    if (!entry.name || !entry.library || !entry.description) {
      this.statusEl.textContent = 'Name, library and description are required.'
      return null
    }
    this.preview.value = JSON.stringify(entry, null, 2)
    this.statusEl.textContent = 'Preview generated. Test it on the board, or open a prefilled GitHub issue.'
    return entry
  }

  openIssue() {
    const entry = this.generate()
    if (!entry) return
    const title = encodeURIComponent(`[API Contribution] ${entry.name}`)
    const body = encodeURIComponent(buildIssueText(entry))
    window.open(`${GITHUB_REPO_URL}/issues/new?title=${title}&body=${body}`, '_blank', 'noopener')
    this.statusEl.textContent = 'Opened a prefilled GitHub issue in a new tab.'
  }

  testLive() {
    const entry = this.generate()
    if (!entry) return
    if (!entry.categories.length) {
      this.statusEl.textContent = 'Pick at least one category so the draft has a column on the board.'
      return
    }
    const result = this.onTestLive ? this.onTestLive(entry) : { ok: false, message: 'Draft testing is unavailable.' }
    this.statusEl.textContent = result.message
    if (result.ok) {
      this.syncDraftState()
      this.dialog.close()
    }
  }

  clearDrafts() {
    if (!this.getDraftCount()) return
    const removed = this.onClearDrafts ? this.onClearDrafts() : 0
    this.statusEl.textContent = `Cleared ${removed} local draft${removed === 1 ? '' : 's'}.`
    this.syncDraftState()
  }

  async copyJson() {
    const entry = this.generate()
    if (!entry) return
    const ok = await copyText(this.preview.value)
    this.statusEl.textContent = ok ? 'JSON copied to clipboard.' : 'Copy failed — copy the preview manually.'
  }

  async copyIssue() {
    const entry = this.generate()
    if (!entry) return
    const ok = await copyText(buildIssueText(entry))
    this.statusEl.textContent = ok ? 'Issue text copied — paste it into a new GitHub issue.' : 'Copy failed — copy the preview manually.'
  }

  download() {
    const entry = this.generate()
    if (!entry) return
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = h('a', { href: url, download: `${entry.name || 'new-api'}.json` })
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    this.statusEl.textContent = 'JSON file downloaded.'
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
