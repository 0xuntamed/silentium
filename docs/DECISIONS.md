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

## Phase 3 — ANC scene ("The world, on mute")

**Architecture**
- **`state.ts`** — the whole scene as a pure function of local progress, `ancAt(p)`. The DOM timeline (copy states, dB meter) and the WebGL pass both read it, so reverse scroll is exact.
- **`AncStage.ts`** — imperative three.js, run as a render pass inside the shared canvas: ANC scene → premultiplied half-float render target → composite pass (bubble lens, rim, outside desaturation) → notes drawn on top. Built **lazily** (~2.5 viewports before the scene): building it at load (PMREM + shader compiles) cost ~20 Lighthouse points.
- **Noise = closed-form projection flow** (`projection.ts` ↔ GLSL twin). Each streak flies a straight line past the head; a smooth radial max pushes it out of the bubble, so it rides the shell and leaves tangentially. A bias perpendicular to the path stops head-on particles flipping 180°. Streaks are 8-segment ribbons evaluating the same function along their trail, so tails bend round the bubble. Stateless, so scrubbing never accumulates error.
- **Shell impacts without GPU readback:** 64 tracer particles are evaluated on the CPU each frame; contacts become up to 16 (angle, strength) pairs that flare and ripple the rim in the composite shader.
- **Waves:** nine ribbons; outside the bubble they are jagged hashed noise, inside they are calm sines in brass (`calm = 1 − smoothstep(R·0.9, R·1.03, dist)`) — the shell is literally the filter. They start as the notes system's sheaf and "corrupt" over the first 10% of the scene.
- **Notes pass through:** the notes sim gets `anc {gather, cx, cy, R}`: outside the shell they are drawn in and swirl, inside they slow and hold near 0.85 R, dimmer outside and brighter inside. There is no collision, which is the point.
- **Headphones** are procedural (lathe cup, brass ring, cushion, tube band) lit by a PMREM'd `RoomEnvironment` — no HDRI file. The listener is an original gender-neutral side profile authored as béziers (`profile.ts`); the body fades out with vertex alpha so it dissolves instead of ending in an edge.
- **Shake and grain** (`systems/grain`): shake is a `translate3d` on the GL layer, the near layer and the scene content; grain is a pre-rendered tile hopped around, `mix-blend-mode: overlay`. Both follow `noise`, which peaks at the click.
- **Decorative words** (HONK, CHATTER, ENGINE, SIREN, BEEP, DRILL, SHOUT, ROAR) are sprites in a runtime atlas drawn with Geist, with RGB split and slice glitches; they are not copy.

**Verified (Playwright, `npm run shots -- --anc-checks`)**
- GPU↔CPU projection parity: worst error **1.6e-4** world units (< 0.1 px at 900 px tall) on both desktop and mobile tiers.
- Reverse scroll: frames at p = 0.7 before and after scrubbing 0.3 → 0.5 → 0.7 are **byte-identical** (clocks frozen via `__sil.anc.snapshot`).
- Unit tests (26 total): `ancAt` determinism and ordering; projection never enters the bubble, is continuous along the path including head-on particles, and continuous as the bubble grows.

**Small decisions**
- Head centre sits at 34% of the aspect on wide screens (copy left, figure right) and centred on phones; the bubble radius is capped to fit.
- Colours inside the scene: noise `static` red → ash as the field comes up (`sat` 1 → 0.12); the only brass is music and the shell.
- Chromatic fringe at the rim is deliberately tiny (0.0015 uv); at the first value it painted green/magenta halos on the waves.
- Ribbons need `DoubleSide` — their winding flips with the direction of travel; with back-face culling half of them silently vanished.
- **Reduced motion:** no pin and no loop. The Stage renders three stills (before / ANC on / after) once and the static layout shows them as images; the settled notes field is restored afterwards.
- **Lite tier (phones):** 150 streaks, 56 sprites, no MSAA, no lens or ripple distortion (`uLite`).
- Screen-shake amplitude is 3.4 px on fine pointers, 1.6 px elsewhere.

**Not verified / known gaps**
- Real-GPU frame rate: still unmeasured (software GL in the harness). The ANC pass adds one MSAA half-float target, one fullscreen composite, ~340 ribbons and ~170 sprites; check on your machine.
- Lighthouse desktop (software GL, high variance): performance 75–99 across five runs, typically ≥ 95; accessibility 100; best practices 100.
- The "−42 dB" copy beat and the Spatial hand-off are timing-matched, but Spatial's own rings are still the Phase 1 DOM skeleton.
- The Stage chunk is 960 kB (259 kB gzip) with three + R3F + the ANC pass.

## Phase 4 — Landing surprises

**What shipped**
- **Intro bloom.** The first input throws ~1,300 notes from the dot (high velocity = long streaks, then they relax into drift) while the DOM ring blooms and the gate fades. `bloom.ts` holds the request until the lazy Stage exists (stale after 6 s). With sound opted in, `playBloom()` swells a filtered pad and lands the four-note motif (E5 · B5 · F♯5 · D6 — the same notes that land on the staff).
- **Hero type made of sound.** Each letter is a damped oscillator (`lib/coneLetters.ts`, ~16 Hz, ζ 0.025, fixed 1/240 s sub-steps so a long frame can't blow it up). Excitations: a shockwave ordered by distance from the dot, the cursor passing through a letter, scroll speed, and a 1 Hz heartbeat (stronger with sound on). Output is `y`, `scaleY`, `skewX` only, through `quickSetter`; the entrance still owns `yPercent`.
- **SILENTIUM One** (`scenes/Materials/model.ts`): procedural, 24 uniquely named parts (the same 24 as the copy list), original geometry. One model serves the hero (assembled) and the exploded view. It is a render pass in the shared canvas (premultiplied MSAA target + blit) lit by the shared PMREM'd `RoomEnvironment` (`gl/env.ts`, no HDRI file).
- **Exploded view.** `materialsProduct(p)` is pure: parts lock in one after another (`partProgress`), then a full 360° turn, then it fades. Each part carries a DOM label that follows its projected position and is visible only while that part is moving; 24 labels are `translate3d` + opacity. Mobile shows a third of them. The finish switcher (Basalt / Bone / Brass) eases the shared materials between colourways (`role="radiogroup"`).
- **Spatial** (`SpatialPass.ts`): one full-screen signed-distance-field pass — a top-down contour head with cups, a source, rings pulsing from it, a wedge of rings from the head toward it, dotted line, L/R level arcs on the ears, reference rings. The source follows the pointer (or a tap), and orbits on autopilot after 2.6 s of no input. The ANC bubble's final ring is handed over and relaxes into the first reference ring; the head sits where the ANC listener did.
- **Spatial audio.** With sound on, a real Web Audio `PannerNode` (HRTF) follows the source while the scene is on screen, playing a synthesized pentatonic pluck loop — no audio files. The DOM readout (azimuth, distance, L/R dB) is live and comes from `spatialMath.readSource` (equal-power pan with a 0.16 floor on the far ear, gentle distance roll-off).
- **Handoffs.** Hero model lifts out as the staff gathers; ANC bubble ring → Spatial reference ring; Spatial rings contract into the headphone outline (dash formation, shifted to where the model will appear) → model appears and assembles.

**Small decisions**
- **Hero view is three-quarter, not a true profile.** The plan said "side profile" to prime the ANC fit; edge-on, the band is a pole and the cup reads as a lamp. A 3/4 view reads as a product.
- **Orthographic projection** keeps the technical-drawing feel in the exploded view (no perspective convergence).
- **Passes are built lazily:** ANC 2.5 viewports ahead, Spatial 3.2, and the product model ~2.2 s after the bloom (or on first scroll), so the bloom never hitches on PMREM/shader compile.
- **Notes quieten around 3D content** (`dim` input): up to −55% alpha while the model or the Spatial field is up.
- **Sound** stays muted by default; toggling it on is also the user gesture that creates the `AudioContext`. Toggling off suspends the context and tears down the panner.
- **Reduced motion:** no pin, no loop. The Stage renders two model stills (exploded / assembled) once; Materials shows them with the 24-part index; Spatial shows static rings. Letters don't ring.
- **New harness hooks** (dev/test only): `__sil.product.{setP,setFinish,snapshot}`, `__sil.spatial.{setP,snapshot}`; `npm run shots -- --sound` opts into sound before entering.

**Tests (40 total):** `productState` determinism and beats, `partProgress` ordering, spatial maths (azimuth, pan law, distance roll-off, autopilot stays in the playfield), the model has 24 uniquely named, uniquely ordered parts that mirror left/right, and the cone-letter oscillator rings then settles and is stable at long frames.

**Not verified / known gaps**
- **Sound has not been listened to.** The synthesis and HRTF path run without errors in headless Chrome, but nobody has heard it; judge the pad level and the pluck loop on your own headphones.
- Real-GPU frame rate is still unmeasured (software GL in the harness).
- The model is procedural and plain next to a hand-modelled GLB; fine for a first pass, and the single `buildHeadphones()` boundary is where a real model would plug in.
- Spatial's pointer steering is not exercised by the harness (it uses the deterministic autopilot).

**Verified (Phase 4)**
- `npm run build` clean; 40 unit tests pass; ANC parity (1.6e-4) and reverse-scroll byte-identity still pass after the pass refactor.
- Full screenshot run at 1440 and 390 (72 images) with **sound opted in**: no console or page errors. Reduced-motion run reviewed: stills for ANC and the model, the 24-part index, static Spatial rings.
- **Bundle:** the main chunk is 486 kB (165 kB gzip); three.js, R3F and every 3D scene sit in the lazy Stage chunk (974 kB / 264 kB gzip). A slip put three.js in the main chunk (867 kB) via a constants import from `model.ts`; fixed by `Materials/constants.ts`.
- **Lighthouse (desktop, software GL, noisy machine):** same-session A/B — Phase 3 commit 73–74 (TBT ~700 ms), Phase 4 81–87 (TBT 310–420 ms); accessibility 100, best practices 100 throughout. Earlier sessions measured 75–99 for Phase 3 on the same hardware, so absolute numbers drift with machine load; the target of ≥ 85 is met on the better runs, not reliably. Phase 7 will code-split and defer more.
- Fixed along the way: my hand-written unlayered `.sr-only` overrode Tailwind's `not-sr-only` variants (the reduced-motion part index was invisible); removed it in favour of Tailwind's.
