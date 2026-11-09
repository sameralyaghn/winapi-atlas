import { spawn } from 'node:child_process'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9336
const base = 'http://127.0.0.1:8138'

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.cwd()}/.chrome-shots`,
  '--no-first-run',
  '--hide-scrollbars',
  'about:blank'
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function target() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((item) => item.type === 'page')
      if (page) return page
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('Chrome did not start')
}

const page = await target()
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let seq = 0
const pending = new Map()
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (!msg.id || !pending.has(msg.id)) return
  const { resolve, reject } = pending.get(msg.id)
  pending.delete(msg.id)
  if (msg.error) reject(new Error(JSON.stringify(msg.error)))
  else resolve(msg.result)
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  seq += 1
  pending.set(seq, { resolve, reject })
  ws.send(JSON.stringify({ id: seq, method, params }))
})

async function shoot({ width, height, file }) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: width < 600 })
  await send('Page.navigate', { url: `${base}/#?theme=dark` })
  await sleep(1600)
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('contribute-btn').click()
      const set = (id, value) => { document.getElementById(id).value = value }
      set('cf-name', 'DraftTestApiW')
      set('cf-library', 'Kernel32.dll')
      set('cf-description', 'Injected into the catalog in this browser only so the card and detail dialog can be reviewed.')
      document.getElementById('cf-cat-injection').checked = true
      set('cf-mitre', 'T1055')
      set('cf-mitre-name', 'Process Injection')
      const body = document.querySelector('#contribute-dialog .dialog-body')
      body.scrollTop = body.scrollHeight
      return true
    })()`
  })
  await sleep(350)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
  console.log(file)
}

await shoot({ width: 1440, height: 1000, file: 'screenshots/.contribute-desktop.png' })
await shoot({ width: 375, height: 812, file: 'screenshots/.contribute-mobile.png' })

ws.close()
chrome.kill()
await sleep(500)
