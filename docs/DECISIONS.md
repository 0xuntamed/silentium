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

## Phase 2 — Notes system

**Added deps (exact):** three 0.186.1, @react-three/fiber 9.8.1, @types/three 0.186.0. drei is not needed yet (Phase 3+).

**Architecture**
- `src/systems/notes/sim.ts` is a pure CPU sim (typed arrays, no DOM/three), unit-tested. 5,000 particles on `full`, 900 on `lite`. Order is `[far notes][mid notes][dashes][near notes]`, so one instanced WebGL draw covers the first three groups and the 2D overlay takes the tail.
- `NotesField` (one instanced draw, premultiplied alpha, no depth) + `NearLayer2D` (Canvas 2D in front of the copy, brass-tinted and pre-blurred sprites, `z-30`). WebGL canvas sits behind the DOM at `z-0`; `<main>` is `z-1`.
- One clock: `Stage` adds a `gsap.ticker` callback that runs `engine.frame(dt)` then R3F `advance()` (`frameloop="never"`). The Stage is a lazy chunk, requested on idle while the intro gate is up.
- `conductor.ts` turns scroll position (or the debug program) into formation weights `{staff, wave, outline, cable}`, eased at 3.2 s⁻¹. `scrollCues.ts` resolves cue positions from ScrollTrigger (pinned scenes) or element rects (unpinned) and re-resolves on every refresh.
- Formations are dashes only: staff = 5 lines × interleaved dashes, wave = the staff bent into a phase-shifted sheaf (analytic, allocation-free), outline = sampled bézier headphones, cable = sampled S-curve ending in a bud. Four mid-layer notes (the "Silentium motif") land on the staff.

**Small decisions**
- **Flow field** is analytic curl noise baked on a 56×32 grid refreshed at 20 Hz (bilinear lookup per particle) — the plan said "curl-noise grid"; this is the cheaper form. Measured in V8: step 0.5–0.8 ms, buffer write 0.2–0.3 ms for 5,000 particles (target was ≤ 1.2 ms).
- **Glyphs** are drawn procedurally (quarter, eighth, beamed 8ths/16ths, half, sharp, flat). **No clefs yet** — the plan allowed Noto Music for clefs; I haven't pulled in a font file. Revisit if you want clefs.
- **Dashes** are rendered as an analytic capsule in the fragment shader, not from the mip-mapped atlas: a 256 px pill minified to ~2 px smeared into ragged staff lines.
- **Parallax** is folded into the sim (drift velocity per layer: far 0.12, mid 0.35, near 1.15 of page scroll), not a render offset, so formations never fight a wrap.
- **Stretch** is along apparent velocity (sim velocity + scroll drift); capped 5× on WebGL layers and 3.2× on the near layer, with alpha dimmed by 1/√stretch so streaks read as motion, not blobs.
- **Cursor** acts as a sound source: ripples while moving, orbit (with a slight inward pull) at rest; held formation members feel only 12% of it. Cursor forces are off on `lite`/touch. A breathing brass ring follows the pointer (fine pointers only).
- **Frame-rate governor** thins the field (down to 40%) after ~1.5 s of sustained >24 ms frames; disabled under WebDriver because headless runs on software GL.
- **Tiers** (`src/lib/tier.ts`): `full`, `lite` (coarse pointer or width < 768), `still` (reduced motion: sim prewarmed 240 steps, one frame rendered, no loop, no cursor).
- **Debug:** `?debug` (dev/test builds only) shows a conductor scrub panel; `window.__sil.notes` exposes `setProgram`, `burst`, `fastForward`, `staffError`, `stats`.
- **Scroll cues wired now** (provisional until each scene exists): hero 0.95 → staff, ANC 0.03–0.1 → wave, materials 0.03–0.14 → outline, CTA 0.7 → cable. Phases 3–5 will replace them with the real handoffs.
- **Screenshots** run under software WebGL (~12–20 fps), so `fastForward` steps the sim without rendering and the harness waits for the real scroll-velocity signal to decay before settling. Headless frame rates say nothing about real GPU frame rates.

**Not measured (be honest):** real-GPU frame rate. Only CPU cost of the sim/writes is measured; the 60 fps target needs a check on real hardware.

**Lighthouse (desktop, with the Stage lazy-loaded):** performance 88–97 across runs (TBT 140–290 ms), accessibility 100, best practices 100. The Stage chunk is 932 kB (249 kB gzip) — three + R3F; trim in Phase 7.
