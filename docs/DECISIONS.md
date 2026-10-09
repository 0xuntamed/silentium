# Decisions log

Short log of choices made while building. Big decisions are approved in the plan; small ones are noted here.

## Phase 1 — Foundations

**Approved (big):** palette (basalt `#0B0B0C`, graphite, slate, fog, ash, bone `#EFE9DD`, brass `#C6A15B`; `static` `#F2542D` is a narrative colour for noise only), Instrument Serif + Geist, "Silence → Put them on" concept.

**Stack versions (exact, `npm i -E`):** react 19.3.0, vite 8.3.4, tailwindcss 4.3.3, typescript 7.0.2, gsap 3.15.0, @gsap/react 2.1.2, lenis 1.3.26, motion 14.0.0, vitest 5.0.3, @playwright/test 1.64.0.

**Small decisions**
- **GSAP licence/imports:** gsap 3.15.0 ships under the "standard no charge" licence with all plugins in the package. Imports: `gsap/ScrollTrigger`, `gsap/SplitText`, `gsap/CustomEase`; `useGSAP` from `@gsap/react`.
- **Framer Motion** is now the `motion` package; imported through `LazyMotion` + `motion/react-m` (`domAnimation`) to keep the bundle small.
- **react-router deferred.** v8.4 needs Node ≥ 22.22 (this machine has 22.13). Routing isn't needed until Phase 6; pick a Node-compatible version (or upgrade Node) then.
- **Tailwind v4** with tokens in `@theme` (`src/styles/index.css`); no `tailwind.config`.
- **Fonts** self-hosted from `public/assets/fonts` (latin subsets only), preloaded, with `size-adjust` fallback faces. Fallback metrics are estimates — verify in Phase 7.
- **Scene lengths** in `src/lib/scenes.ts` are the *pinned scroll distance* in % of viewport (hero 220, anc 520, spatial 300, materials 380, specs 180); mobile ×0.7. Total landing scroll is therefore ~1,980 vh on desktop (the plan's 1,820 vh counted viewport-inclusive lengths). Revisit if it feels long.
- **Scrub:** `scrub: true` everywhere (Lenis already smooths); Lenis `lerp 0.09`, `syncTouch:false`.
- **Reduced motion:** Lenis is not created; scenes build no timelines, so each scene renders as its static, still-designed layout (hidden "from" states live in GSAP, never in CSS/inline, so nothing stays invisible).
- **Intro gate (Phase 1):** DOM-only; first pointer/wheel/key/click enters. A real `<button>` takes initial focus, `<main>` is `inert` until entry. Bloom is a ring + fade for now; the WebGL note burst and cone-vibrating wordmark arrive in Phase 4.
- **Sound** is preference-only state (`src/lib/audio.ts`); muted by default, no synthesis yet.
- **Test hooks:** `window.__sil` (enter / goto(scene, p) / scenes / total) exists only in dev and `--mode test` builds. `npm run shots` builds in test mode to `dist-test` and writes screenshots to `shots/`. `--reduced` emulates `prefers-reduced-motion`.
- **Placeholder content:** all copy is in `src/content/copy.ts`. Spec numbers, price (`From $449`), finish names and the three reviews (fictional listeners) are placeholders and labelled as such on the page.
- **Nav links** scroll to scenes via their ScrollTrigger start (pinned scenes live in pin-spacers). Cart is a non-functional label until Phase 5.
- **Hero** wordmark is split into per-letter spans manually (not SplitText) so the scrub can move the clip-masks and the entrance can move the glyphs inside them.

**Measured (Phase 1, production build, desktop Lighthouse)**: Performance 88–92 (TBT 230–290 ms, LCP 0.7 s, CLS 0), Accessibility 100, Best practices 100, SEO 91→ robots.txt added. Target of ≥ 95 was **not** met; the cost is one 469 kB JS bundle (React + GSAP plugins). Plan: code-split and defer non-critical init in Phase 7 (the Phase 2 WebGL chunk will be lazy-loaded behind the intro).
