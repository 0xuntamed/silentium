// Product pages + compare + routing: screenshots and behaviour checks at 1440 and 390.
// Usage: CHROMIUM_PATH=... node scripts/pages.mjs [--reduced]
import { build, preview } from 'vite'
import { chromium } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'

const reduced = process.argv.includes('--reduced')
const out = 'shots-pages'
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

await build({ mode: 'test', logLevel: 'warn', build: { outDir: 'dist-test', emptyOutDir: true } })
const server = await preview({ mode: 'test', logLevel: 'warn', build: { outDir: 'dist-test' }, preview: { port: 4175, strictPort: true } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const problems = []
const note = (vp, ok, msg) => {
  console.log(vp, ok ? 'ok:' : 'FAIL:', msg)
  if (!ok) problems.push(`[${vp}] ${msg}`)
}
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
]
const suffix = reduced ? '-reduced' : ''

try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => problems.push(`[${vp.name}] pageerror ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && problems.push(`[${vp.name}] console ${m.text()}`))
    const shot = (n) => page.screenshot({ path: `${out}/${vp.name}${suffix}-${n}.png` })
    const scrollTo = async (y) => {
      await page.evaluate((v) => window.scrollTo(0, v), y)
      await page.waitForTimeout(900)
    }

    for (const id of ['one', 'buds']) {
      await page.goto(`${base}/${id}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(4500) // fade-in under software GL
      await shot(`${id}-00-hero`)
      note(vp.name, (await page.title()).includes('SILENTIUM'), `${id}: title ${await page.title()}`)
      note(vp.name, (await page.locator('h1').count()) === 1, `${id}: one h1`)

      // Finish switch + explode + angle, deterministic snapshots through the stage hook.
      await page.getByRole('radio', { name: 'Brass' }).click()
      await page.waitForTimeout(900)
      note(vp.name, (await page.evaluate(() => window.__sil.view.state().finish)) === 2, `${id}: finish switches to Brass`)
      await page.getByRole('button', { name: 'Explode', exact: true }).click()
      await page.waitForTimeout(2500)
      await shot(`${id}-01-exploded`)
      note(vp.name, await page.getByRole('button', { name: 'Assemble' }).count(), `${id}: explode toggles label`)
      await page.getByRole('button', { name: 'Assemble' }).click()
      await page.getByRole('button', { name: 'Side' }).click()
      await page.waitForTimeout(2500)
      await shot(`${id}-02-side`)

      // Keyboard turns the model.
      const before = await page.evaluate(() => window.__sil.view.state().targetY)
      await page.locator('[data-viewer]').focus()
      await page.keyboard.press('ArrowRight')
      const after = await page.evaluate(() => window.__sil.view.state().targetY)
      note(vp.name, after > before, `${id}: arrow key turns the model`)

      if (!vp.mobile) {
        const box = await page.locator('[data-viewer]').boundingBox()
        const y0 = await page.evaluate(() => window.__sil.view.state().targetY)
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2, { steps: 8 })
        await page.mouse.up()
        const y1 = await page.evaluate(() => window.__sil.view.state().targetY)
        note(vp.name, y1 - y0 > 0.5, `${id}: dragging turns the model (${(y1 - y0).toFixed(2)} rad)`)
      }

      // Add to cart opens the drawer with the chosen finish.
      await page.getByRole('button', { name: /^Add to cart/ }).first().click()
      await page.waitForTimeout(900)
      const drawer = await page.locator('[role=dialog]').innerText()
      note(vp.name, /brass/i.test(drawer), `${id}: cart has the Brass finish`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(700)

      const H = vp.height
      for (const [n, y] of [['03-glance', 1.05 * H], ['04-anatomy', 2.0 * H], ['05-specs', 3.1 * H], ['06-end', 99999]]) {
        await scrollTo(y)
        await shot(`${id}-${n}`)
      }
      note(vp.name, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${id}: no horizontal overflow`)
    }

    // Compare.
    await page.goto(`${base}/compare`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await shot('compare-00')
    await scrollTo(0.9 * vp.height)
    await shot('compare-01-table')
    const rowsAll = await page.locator('tbody tr').count()
    await page.getByRole('button', { name: /only differences/i }).click()
    await page.waitForTimeout(900)
    const rowsDiff = await page.locator('tbody tr').count()
    note(vp.name, rowsDiff < rowsAll, `compare: differences filter (${rowsAll} → ${rowsDiff})`)
    await shot('compare-02-diff')
    note(vp.name, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'compare: no horizontal overflow')

    // Routing: landing → product via link, back button, 404.
    await page.goto(`${base}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.evaluate(() => window.__sil.enter())
    await page.waitForTimeout(1500)
    await page.evaluate(() => window.__sil.goto('materials', 0.9))
    await page.waitForTimeout(800)
    await page.evaluate(() => { history.pushState({}, '', '/'); })
    await page.locator('a[href="/one"]').first().evaluate((a) => a.click()).catch(() => {})
    await page.waitForTimeout(2500)
    note(vp.name, page.url().endsWith('/one'), 'router: link navigates to /one')
    await page.goBack()
    await page.waitForTimeout(2500)
    note(vp.name, page.url().endsWith('/') && (await page.locator('#hero').count()) === 1, 'router: back returns to the landing')
    await page.goto(`${base}/nope`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    note(vp.name, (await page.getByText('Nothing').count()) > 0, '404 page renders')
    await shot('404')
    await ctx.close()
  }
} finally {
  await browser.close()
  await server.close()
}
writeFileSync(`${out}/problems.txt`, problems.join('\n'))
console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.join('\n')}` : '\nall checks passed')
