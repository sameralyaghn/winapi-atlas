#!/usr/bin/env node
/**
 * Minimal static file server for local development.
 * Usage: node scripts/serve.mjs [port]
 * Serves the repository root; no dependencies, no build step.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'))
const port = Number(process.argv[2]) || 8000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8'
}

function resolvePath(urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0])
  } catch {
    return null
  }
  const target = normalize(join(root, decoded === '/' ? 'index.html' : decoded))
  if (target !== root && !target.startsWith(root + sep)) return null
  return target
}

const server = createServer(async (req, res) => {
  const target = resolvePath(req.url || '/')
  if (!target) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }
  try {
    let filePath = target
    const info = await stat(filePath)
    if (info.isDirectory()) filePath = join(filePath, 'index.html')
    const body = await readFile(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`WinAPI Atlas running at http://localhost:${port}`)
})
