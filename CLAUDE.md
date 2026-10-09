# SILENTIUM — premium earphone brand website

Creative brief: see docs/BRIEF.md. Read it before any design or animation work.

## Stack
- Vite + React + TypeScript, Tailwind CSS
- GSAP + ScrollTrigger + SplitText (scroll timelines, pinning, scrub)
- Framer Motion (component enter/exit, hover, layout)
- Lenis smooth scroll, synced to ScrollTrigger via gsap.ticker
- React Three Fiber + drei for 3D; Canvas/WebGL instancing for particles
- Install exact versions; check the current GSAP license/plugin import paths before use

## Structure
- src/scenes/   — one folder per pinned scroll scene (Hero, ANC, Spatial, Materials)
- src/systems/  — shared systems (NotesField particle system, scroll velocity, cursor)
- src/components/ — UI pieces
- src/lib/      — gsap setup, lenis setup, hooks (useScrollVelocity, useReducedMotion)
- public/assets/ — original or generated assets only

## Rules
- One GSAP context per scene; always clean up in useEffect/useGSAP return.
- Animate only transform and opacity on DOM. Heavy particle work goes in canvas/WebGL.
- Every scene has a prefers-reduced-motion version (static but still designed).
- Every scene works on mobile with a lighter mode (fewer particles, no heavy shaders).
- No real brand logos, product photos, or copied layouts.
- Real text in HTML for all headings and copy (not only canvas).

## Workflow
- Work in the phases in docs/BRIEF.md. Do one phase, then stop and report.
- After each phase: run `npm run build` (must pass with no type errors), then use
  Playwright to open the dev server, scroll through each scene, and take screenshots
  at key scroll positions (desktop 1440px and mobile 390px). Look at the
  screenshots and fix visual problems before reporting.
- Commit after each working phase with a clear message.
- For small decisions (exact easing, a placeholder copy line), choose and note it.
  For big decisions (brand colors, fonts, scene concept), ask me.
- Keep a short log of decisions in docs/DECISIONS.md.