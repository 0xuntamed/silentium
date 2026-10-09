// Screenshot harness: builds in `test` mode (enables window.__sil hooks), previews it,
// then scrolls each scene to key progress points at desktop (1440) and mobile (390) widths.
// Usage: npm run shots [-- --only=anc]
import { build, preview } from 'vite'
import { chromium } from '@playwright/test'
import { mkdirSync, rmSync } from 'node:fs'

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const reduced = process.argv.includes('--reduced')
const notesOnly = process.argv.includes('--notes')
const out = 'shots'
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const PLAN = {
  hero: [0, 0.3, 0.6, 0.95],
  anc: [0, 0.2, 0.34, 0.5, 0.7, 0.9, 1],
  spatial: [0, 0.4, 0.9],
  materials: [0.05, 0.5, 0.8],
  specs: [0.05, 0.5, 0.85],
  reviews: [0],
  cta: [0],
}
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
]

await build({ mode: 'test', logLevel: 'warn', build: { outDir: 'dist-test', emptyOutDir: true } })
const server = await preview({ mode: 'test', logLevel: 'warn', build: { outDir: 'dist-test' }, preview: { port: 4174, strictPort: true } })
const url = server.resolvedUrls.local[0]

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errors.push(`[${vp.name}] ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && errors.push(`[${vp.name}] ${m.text()}`))
    await page.goto(url, { waitUntil: 'networkidle' })
    const tag = (n) => `${out}/${vp.name}${reduced ? '-reduced' : ''}-${n}.png`

    if (!only) {
      await page.waitForTimeout(3800)
      await page.screenshot({ path: tag('00-gate') })
      await page.mouse.click(vp.width / 2, vp.height / 2)
      await page.waitForTimeout(700)
      await page.screenshot({ path: tag('01-bloom') })
      await page.waitForTimeout(3200)
    } else {
      await page.waitForTimeout(500)
      await page.evaluate(() => window.__sil.enter())
      await page.waitForTimeout(2500)
    }
    if (reduced) {
      await page.evaluate(() => window.__sil.enter?.())
      await page.waitForTimeout(500)
      await page.screenshot({ path: tag('full'), fullPage: true })
      await ctx.close()
      continue
    }

    if (notesOnly) {
      await page.evaluate(() => window.__sil.enter())
      await page.mouse.move(vp.width * 0.7, vp.height * 0.4)
      await page.waitForTimeout(2500)
      for (const p of [0, 0.26, 0.46, 0.66, 0.9]) {
        await page.evaluate((q) => window.__sil.notes.setProgram(q), p)
        await page.evaluate(() => window.__sil.notes.fastForward(4))
        await page.waitForTimeout(400)
        await page.screenshot({ path: tag('notes-p' + String(Math.round(p * 100)).padStart(3, '0')) })
      }
      await page.evaluate(() => window.__sil.notes.setProgram(0.0))
      await page.waitForTimeout(2500)
      // Fast scroll: notes should stream and stretch.
      for (let k = 0; k < 5; k++) {
        await page.mouse.wheel(0, 300)
        await page.waitForTimeout(40)
      }
      await page.screenshot({ path: tag('notes-streak') })
      await page.waitForTimeout(3000)
      await page.screenshot({ path: tag('notes-settled') })
      // Scroll-driven cues (no debug override): staff at the end of hero, wave at ANC start, outline, cable.
      await page.evaluate(() => window.__sil.notes.setProgram(null))
      for (const [id, p] of [['hero', 0.97], ['anc', 0.1], ['materials', 0.08]]) {
        await page.evaluate(([i, q]) => window.__sil.goto(i, q), [id, p])
        await page.waitForTimeout(1800) // let the real scroll-velocity signal decay
        await page.evaluate(() => window.__sil.notes.fastForward(4))
        await page.waitForTimeout(400)
        await page.screenshot({ path: tag('notes-scroll-' + id) })
      }
      await page.evaluate(() => document.getElementById('cta').scrollIntoView())
      await page.evaluate(() => window.scrollBy(0, 0))
      await page.evaluate(() => window.__sil.notes.fastForward(4))
        await page.waitForTimeout(400)
      await page.screenshot({ path: tag('notes-scroll-cta') })
      console.log(vp.name, JSON.stringify(await page.evaluate(() => window.__sil.notes.stats())))
      await ctx.close()
      continue
    }
    for (const [id, points] of Object.entries(PLAN)) {
      if (only && only !== id) continue
      for (const p of points) {
        const ok = await page.evaluate(([i, q]) => window.__sil.goto(i, q), [id, p])
        if (!ok) {
          errors.push(`[${vp.name}] scene-${id} not registered`)
          break
        }
        await page.waitForTimeout(450)
        await page.screenshot({ path: tag(`${id}-${String(Math.round(p * 100)).padStart(3, '0')}`) })
      }
    }
    const info = await page.evaluate(() => ({ total: window.__sil.total(), scenes: window.__sil.scenes(), lenis: window.__sil.lenis() }))
    console.log(vp.name, JSON.stringify(info))
    await ctx.close()
  }
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}
if (errors.length) {
  console.error('Console/page errors:\n' + [...new Set(errors)].join('\n'))
  process.exitCode = 1
}
