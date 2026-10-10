// axe-core over every route (and the landing at a few scene positions), desktop + mobile, motion + reduced.
// Usage: CHROMIUM_PATH=... node scripts/a11y.mjs
import { build, preview } from 'vite'
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const axeSrc = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
await build({ mode: 'test', logLevel: 'error', build: { outDir: 'dist-test', emptyOutDir: true } })
const server = await preview({ mode: 'test', logLevel: 'error', build: { outDir: 'dist-test' }, preview: { port: 4177, strictPort: true } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

let total = 0
const run = async (page, label) => {
  await page.evaluate(axeSrc)
  const res = await page.evaluate(() =>
    window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } }),
  )
  for (const v of res.violations) {
    total++
    console.log(`FAIL [${label}] ${v.id} (${v.impact}): ${v.help}`)
    for (const n of v.nodes.slice(0, 3)) console.log('    ', n.target.join(' '), '|', (n.failureSummary || '').split('\n')[1] || '')
  }
  if (!res.violations.length) console.log(`ok   [${label}] no violations`)
}

try {
  for (const reduced of [false, true]) {
    for (const vp of [{ n: 'desktop', w: 1440, h: 900 }, { n: 'mobile', w: 390, h: 844 }]) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, reducedMotion: reduced ? 'reduce' : 'no-preference', isMobile: vp.n === 'mobile', hasTouch: vp.n === 'mobile' })
      const page = await ctx.newPage()
      const tag = `${vp.n}${reduced ? ' reduced' : ''}`
      await page.goto(base + '/', { waitUntil: 'networkidle' })
      await page.waitForTimeout(4200) // let the hint finish fading in
      await run(page, `${tag} / (intro gate)`)
      await page.evaluate(() => window.__sil.enter())
      await page.waitForTimeout(2500)
      if (reduced) {
        await run(page, `${tag} / (static)`)
      } else {
        for (const [id, p] of [['hero', 0.5], ['anc', 0.6], ['spatial', 0.5], ['materials', 0.7], ['specs', 0.5]]) {
          await page.evaluate(([i, q]) => window.__sil.goto(i, q), [id, p])
          await page.waitForTimeout(1200)
          await run(page, `${tag} / ${id}`)
        }
        await page.evaluate(() => window.scrollTo(0, 1e6))
        await page.waitForTimeout(1500)
        await run(page, `${tag} / reviews+cta`)
      }
      for (const route of ['/one', '/buds', '/compare', '/nope']) {
        await page.goto(base + route, { waitUntil: 'networkidle' })
        await page.waitForTimeout(2500)
        await run(page, `${tag} ${route}`)
      }
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  await server.close()
}
console.log(total ? `\n${total} violation(s)` : '\nno axe violations')
process.exit(total ? 1 : 0)
