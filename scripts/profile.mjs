// CPU profile of a route at 4x throttle (software GL). Build first: npx vite build --minify false --outDir dist-prof
// Usage: CHROMIUM_PATH=... node scripts/profile.mjs /one
import { preview } from 'vite'
import { chromium } from '@playwright/test'
const route = process.argv[2] || '/one'
const server = await preview({ logLevel: 'error', build: { outDir: 'dist-prof' }, preview: { port: 4178, strictPort: true } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1350, height: 940 } })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 500 })
await cdp.send('Profiler.start')
await page.goto(base + route, { waitUntil: 'load' })
await page.waitForTimeout(7000)
const { profile } = await cdp.send('Profiler.stop')
const self = new Map()
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
const dt = profile.timeDeltas
profile.samples.forEach((id, i) => {
  const n = byId.get(id)
  const f = n.callFrame
  const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`
  self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000)
})
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28)
for (const [k, v] of top) console.log(String(Math.round(v)).padStart(6), 'ms', k)
await browser.close(); await server.close()
