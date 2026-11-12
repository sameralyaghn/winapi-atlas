/**
 * Chain Map export: builds a deterministic layout model and draws it on a 2x
 * canvas. The layout/model helpers stay free of DOM access so they can be unit
 * tested; only renderChainMap/downloadChainMap touch the browser.
 */

export const CHAIN_LIMIT = 12
export const CHAIN_FILENAME = 'winapi-atlas-chain.png'

const SCALE = 2
const WIDTH = 1800
const MARGIN = 70
const COLUMNS = 4
const CARD_WIDTH = 370
const CARD_HEIGHT = 280
const GAP_X = 60
const GAP_Y = 90
const HEADER_HEIGHT = 236
const FOOTER_HEIGHT = 82

const SANS = '"Segoe UI", "Helvetica Neue", Arial, sans-serif'
const MONO = '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
const CYAN = '#38bdf8'
const MUTED = '#94a3b8'
const FAINT = '#64748b'

const SUSPICION_COLOR = {
  low: '#34d399',
  medium: '#fbbf24',
  high: '#f87171'
}

/** Card geometry for a row-major chain with four cards per row. */
export function chainPositions(count) {
  const rows = Math.max(1, Math.ceil(count / COLUMNS))
  const height = HEADER_HEIGHT + rows * CARD_HEIGHT + Math.max(0, rows - 1) * GAP_Y + FOOTER_HEIGHT
  const nodes = []
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / COLUMNS)
    const column = index % COLUMNS
    nodes.push({
      step: index + 1,
      row,
      column,
      x: MARGIN + column * (CARD_WIDTH + GAP_X),
      y: HEADER_HEIGHT + row * (CARD_HEIGHT + GAP_Y),
      width: CARD_WIDTH,
      height: CARD_HEIGHT
    })
  }
  return { width: WIDTH, height, nodes }
}

function shortLibrary(value) {
  return String(value || '')
    .replace(/\.dll$/i, '')
    .toUpperCase() || 'UNKNOWN'
}

/** Builds the data the canvas renderer needs, preserving the input order. */
export function buildChainModel(apis, categories, options = {}) {
  const categoryById = new Map((categories || []).map((category) => [category.id, category]))
  const layout = chainPositions(apis.length)
  const nodes = apis.map((api, index) => {
    const categoryId = (api.categories || [])[0] || ''
    const category = categoryById.get(categoryId)
    const mitre = (api.mitre || [])[0]
    return {
      ...layout.nodes[index],
      name: api.name,
      library: shortLibrary(api.library),
      description: String(api.description || '').replace(/\s+/g, ' ').trim(),
      categoryId,
      categoryTitle: category ? category.title : 'Uncategorized',
      categoryColor: category?.color || CYAN,
      mitreId: mitre?.id || '',
      statusColor: SUSPICION_COLOR[api.suspicion] || MUTED
    }
  })

  const match = options.technique?.preset ? options.technique : null
  const preset = match ? match.preset : null
  const presetId = preset?.mitre?.id || ''
  const presetTitle = preset?.title || ''
  const scope = options.scope === 'selection' ? 'selection' : 'visible'
  const totalVisible = Number.isFinite(options.totalVisible) ? options.totalVisible : apis.length
  const scopeText = scope === 'selection'
    ? `${apis.length} selected API${apis.length === 1 ? '' : 's'} in click order`
    : `${apis.length} of ${totalVisible} visible API${totalVisible === 1 ? '' : 's'}${totalVisible > apis.length ? ` · capped at ${CHAIN_LIMIT}` : ''}`
  const categoryCount = new Set(nodes.map((node) => node.categoryId).filter(Boolean)).size
  const title = `WinAPI Atlas — API Execution Chain${preset ? ` (${presetTitle}${presetId ? ` ${presetId}` : ''})` : ''}`

  return {
    ...layout,
    nodes,
    title,
    subtitle: `${scopeText} · ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`,
    presetTitle,
    presetId,
    presetScore: match ? match.score : null,
    scope,
    totalVisible
  }
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                       */
/* ------------------------------------------------------------------ */

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function withAlpha(color, alpha) {
  const raw = String(color || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(raw)) return `rgba(56, 189, 248, ${alpha})`
  const value = Number.parseInt(raw, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function setFont(ctx, weight, size, mono = false) {
  ctx.font = `${weight} ${size}px ${mono ? MONO : SANS}`
}

function fitFont(ctx, text, maxWidth, { weight = '700', size = 28, mono = false, minSize = 14 } = {}) {
  let current = size
  while (current > minSize) {
    setFont(ctx, weight, current, mono)
    if (ctx.measureText(text).width <= maxWidth) break
    current -= 1
  }
  setFont(ctx, weight, current, mono)
  return current
}

function truncateText(ctx, text, maxWidth) {
  const value = String(text || '')
  if (ctx.measureText(value).width <= maxWidth) return value
  let output = value
  while (output.length > 1 && ctx.measureText(`${output}…`).width > maxWidth) {
    output = output.slice(0, -1)
  }
  return `${output}…`
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const lines = []
  let line = ''
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = line ? word : truncateText(ctx, word, maxWidth)
    if (lines.length === maxLines) {
      const remainder = words.slice(index).join(' ')
      lines[maxLines - 1] = truncateText(ctx, `${lines[maxLines - 1]} ${remainder}`, maxWidth)
      return lines
    }
  }
  if (line) {
    if (lines.length === maxLines) {
      lines[maxLines - 1] = truncateText(ctx, `${lines[maxLines - 1]} ${line}`, maxWidth)
    } else {
      lines.push(line)
    }
  }
  return lines.slice(0, maxLines)
}

function drawBackground(ctx, width, height) {
  const background = ctx.createLinearGradient(0, 0, width, height)
  background.addColorStop(0, '#0b1220')
  background.addColorStop(0.52, '#0f172a')
  background.addColorStop(1, '#0b1220')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.16, 0, 0, width * 0.16, 0, width * 0.55)
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.13)')
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.055)'
  ctx.lineWidth = 1
  for (let x = 0; x <= width; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
    ctx.stroke()
  }
  ctx.restore()
}

function drawHeader(ctx, model) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const maxWidth = model.width - MARGIN * 2
  fitFont(ctx, model.title, maxWidth, { weight: '700', size: 40, minSize: 23 })
  const titleWidth = Math.min(maxWidth, ctx.measureText(model.title).width)
  const titleGradient = ctx.createLinearGradient(
    model.width / 2 - titleWidth / 2,
    0,
    model.width / 2 + titleWidth / 2,
    0
  )
  titleGradient.addColorStop(0, '#f8fafc')
  titleGradient.addColorStop(0.62, '#e0f2fe')
  titleGradient.addColorStop(1, CYAN)
  ctx.fillStyle = titleGradient
  ctx.fillText(model.title, model.width / 2, 105)

  setFont(ctx, '500', 14, true)
  ctx.fillStyle = MUTED
  ctx.fillText(model.subtitle, model.width / 2, 140)

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MARGIN, 188)
  ctx.lineTo(model.width - MARGIN, 188)
  ctx.stroke()

  ctx.strokeStyle = CYAN
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(model.width / 2 - 34, 188)
  ctx.lineTo(model.width / 2 + 34, 188)
  ctx.stroke()
  ctx.restore()
}

function drawFooter(ctx, model) {
  const y = model.height - 54
  ctx.save()
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(MARGIN, y)
  ctx.lineTo(model.width - MARGIN, y)
  ctx.stroke()
  ctx.textAlign = 'center'
  setFont(ctx, '500', 13, true)
  ctx.fillStyle = FAINT
  ctx.fillText('winapi-atlas.vercel.app', model.width / 2, model.height - 25)
  ctx.restore()
}

function drawCard(ctx, node) {
  const { x, y, width, height } = node
  ctx.save()
  const cardFill = ctx.createLinearGradient(x, y, x, y + height)
  cardFill.addColorStop(0, '#111827')
  cardFill.addColorStop(1, '#0d1524')
  roundRectPath(ctx, x, y, width, height, 12)
  ctx.fillStyle = cardFill
  ctx.fill()
  ctx.strokeStyle = withAlpha(node.categoryColor, 0.58)
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  setFont(ctx, '700', 15, true)
  ctx.fillStyle = MUTED
  ctx.fillText(`#${node.step}`, x + 20, y + 34)

  ctx.textAlign = 'right'
  setFont(ctx, '700', 12, true)
  ctx.fillStyle = MUTED
  const library = truncateText(ctx, node.library, 116)
  ctx.fillText(library, x + width - 20, y + 34)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#f8fafc'
  fitFont(ctx, node.name, width - 40, { weight: '700', size: 28, mono: true, minSize: 16 })
  ctx.fillText(node.name, x + 20, y + 78)

  const categoryText = `${node.categoryTitle.toUpperCase()}${node.mitreId ? ` · ${node.mitreId}` : ''}`
  setFont(ctx, '700', 11)
  const maxPillWidth = width - 40
  const pillText = truncateText(ctx, categoryText, maxPillWidth - 38)
  const pillWidth = Math.min(maxPillWidth, ctx.measureText(pillText).width + 38)
  const pillY = y + 94
  roundRectPath(ctx, x + 20, pillY, pillWidth, 28, 14)
  ctx.fillStyle = withAlpha(node.categoryColor, 0.16)
  ctx.fill()
  ctx.strokeStyle = withAlpha(node.categoryColor, 0.55)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x + 34, pillY + 14, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = node.categoryColor
  ctx.fill()
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(pillText, x + 44, pillY + 18)

  const boxX = x + 18
  const boxY = y + 144
  const boxWidth = width - 36
  const boxHeight = 114
  roundRectPath(ctx, boxX, boxY, boxWidth, boxHeight, 8)
  ctx.fillStyle = '#1e293b'
  ctx.fill()
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)'
  ctx.lineWidth = 1
  ctx.stroke()

  setFont(ctx, '600', 11, true)
  ctx.fillStyle = '#cbd5e1'
  ctx.fillText(truncateText(ctx, node.name, boxWidth - 42), boxX + 12, boxY + 22)

  ctx.beginPath()
  ctx.arc(boxX + boxWidth - 14, boxY + 16, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = node.statusColor
  ctx.shadowColor = node.statusColor
  ctx.shadowBlur = 8
  ctx.fill()
  ctx.shadowBlur = 0

  setFont(ctx, '400', 12.5)
  ctx.fillStyle = MUTED
  const lines = wrapLines(ctx, node.description, boxWidth - 24, 3)
  lines.forEach((line, index) => {
    ctx.fillText(line, boxX + 12, boxY + 46 + index * 17)
  })
  ctx.restore()
}

function drawArrowHead(ctx, x, y, direction) {
  ctx.beginPath()
  if (direction === 'right') {
    ctx.moveTo(x, y)
    ctx.lineTo(x - 11, y - 6.5)
    ctx.lineTo(x - 11, y + 6.5)
  } else {
    ctx.moveTo(x, y)
    ctx.lineTo(x - 6.5, y - 11)
    ctx.lineTo(x + 6.5, y - 11)
  }
  ctx.closePath()
  ctx.fill()
}

function drawConnectors(ctx, model) {
  ctx.save()
  ctx.strokeStyle = withAlpha(CYAN, 0.9)
  ctx.fillStyle = CYAN
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = CYAN
  ctx.shadowBlur = 14

  for (let index = 0; index < model.nodes.length - 1; index += 1) {
    const from = model.nodes[index]
    const to = model.nodes[index + 1]

    if (from.row === to.row) {
      const y = from.y + from.height / 2
      const startX = from.x + from.width + 8
      const endX = to.x - 9
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX - 8, y)
      ctx.stroke()
      drawArrowHead(ctx, endX, y, 'right')
      continue
    }

    const startX = from.x + from.width / 2
    const startY = from.y + from.height + 8
    const endX = to.x + to.width / 2
    const endY = to.y - 9
    const midY = from.y + from.height + GAP_Y / 2
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX, midY)
    ctx.lineTo(endX, midY)
    ctx.lineTo(endX, endY - 8)
    ctx.stroke()
    drawArrowHead(ctx, endX, endY, 'down')
  }
  ctx.restore()
}

/** Draws a chain model onto a 2x canvas. */
export function renderChainMap(canvas, model, { scale = SCALE } = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new Error('A canvas element is required')
  canvas.width = Math.round(model.width * scale)
  canvas.height = Math.round(model.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D rendering is unavailable')
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, model.width, model.height)

  drawBackground(ctx, model.width, model.height)
  drawHeader(ctx, model)
  for (const node of model.nodes) drawCard(ctx, node)
  drawConnectors(ctx, model)
  drawFooter(ctx, model)
  return { width: model.width, height: model.height, scale }
}

/** Converts a rendered canvas to a PNG blob. */
export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      reject(new Error('PNG export is unavailable in this browser'))
      return
    }
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The browser returned an empty PNG'))
    }, 'image/png')
  })
}

/** Triggers a download of the rendered chart. */
export async function downloadChainMap(canvas, filename = CHAIN_FILENAME) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false
  }
  const blob = await canvasToPngBlob(canvas)
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
