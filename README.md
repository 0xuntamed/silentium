# SILENTIUM

A premium earphone brand site — a concept, not a real product. Calm, cinematic, scroll-driven: a silent intro, a musical-notes particle system that reacts to scroll and cursor, a pinned noise-cancellation scene, a spatial-audio playground, an exploded product view, and product / compare pages with a 360° viewer.

Creative brief: [`docs/BRIEF.md`](docs/BRIEF.md). Decisions, measurements and known gaps: [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Run

```bash
npm ci
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview    # serve the build on :4173
npm test           # unit tests (vitest)
```

Requires Node ≥ 22. All images, models and sounds are generated in code; there are no third-party assets except the self-hosted fonts (Instrument Serif, Geist — both OFL).

## Routes

`/` landing · `/one` · `/buds` · `/compare`. It is a client-side router, so a static host must send unknown paths to `index.html` (`public/_redirects` and `vercel.json` do that; `vite dev` and `preview` already do).

## Structure

```
src/scenes/    one folder per scene: Hero, ANC, Spatial, Materials, Specs, Reviews, CTA, Product
src/systems/   notes (particles), grain/shake, cursor
src/gl/        the one shared WebGL stage + render passes
src/pages/     product page, compare page
src/components/ nav, cart drawer, newsletter, footer, link, …
src/lib/       gsap, lenis, router, tier, cart, audio, hooks
src/content/   all copy and product data (placeholders, easy to swap)
tests/         unit tests
scripts/       Playwright harnesses (below)
```

## Checks (Playwright; set `CHROMIUM_PATH` if the bundled browser isn't installed)

```bash
npm run shots                      # screenshot every landing scene at 1440 and 390 → shots/
npm run shots -- --reduced         # same with prefers-reduced-motion
npm run shots -- --anc-checks      # GPU↔CPU parity + reverse-scroll byte identity
node scripts/pages.mjs [--reduced] # product/compare/router checks + screenshots → shots-pages/
node scripts/a11y.mjs              # axe-core over every route, both sizes, motion + reduced
node scripts/profile.mjs /one      # 4×-throttled CPU profile (build with --minify false first)
```

Headless Chromium here runs on a software rasteriser, so frame rates and Lighthouse numbers from it say little about real GPUs.

## Accessibility and motion

Real HTML text for all copy; keyboard and screen-reader paths for every control (including the 360° viewer); AA contrast; a skip link. `prefers-reduced-motion` gives a static, designed version of every scene and no loop; phones and coarse pointers get a lighter tier (fewer particles, no lens shader).
