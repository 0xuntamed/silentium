# Project: "SILENTIUM" — Premium Earphone Brand Website

## Role
You are a senior creative developer and motion designer. You have built award-level
sites (Awwwards / FWA quality). You have full creative liberty. Make bold design
decisions. Do not produce a template-looking site.

## Goal
Build a marketing website for a premium wireless earphone and headphone brand.
The site must feel classy, modern, and surprising. The landing experience must be
MORE memorable than the product pages. A visitor should say "wait, how did they do that?"
within the first 5 seconds.

## Brand (placeholder — refine if better ideas come up)
- Name: SILENTIUM
- Tagline idea: "Hear only what matters."
- Hero products:
  1. SILENTIUM One — over-ear headphones, adaptive noise cancellation
  2. SILENTIUM Buds — true wireless earbuds
- Tone: calm, confident, minimal, slightly cinematic. Luxury, not gamer.
- Visual direction: deep near-black backgrounds, warm off-white text, one accent
  color (suggest one: e.g. muted brass, or electric coral). Large editorial
  typography (one serif display font + one clean grotesk). Generous whitespace.
- Inspiration (vibe only — do NOT copy layouts, assets, or logos):
  Apple AirPods Max product page (scroll-driven product reveals),
  Nothing (raw, technical, dot-matrix details), Bang & Olufsen (material luxury),
  Sony WH-1000XM series (ANC storytelling), Teenage Engineering (playful precision),
  Rolex / Aesop sites (restraint and pacing).

## Tech stack (use what each job needs)
- React + Vite (or Next.js App Router) + TypeScript
- GSAP + ScrollTrigger (scroll timelines, pinning, scrubbing) + SplitText for type
- Framer Motion (component enter/exit, hover, layout transitions)
- Lenis for smooth scroll (synced with ScrollTrigger)
- React Three Fiber + drei for 3D (product model, particle fields) where it adds real value
- Canvas 2D or WebGL shaders for heavy particle systems (not thousands of DOM nodes)
- Tailwind CSS for layout
- Optional: Web Audio API for subtle UI sound (muted by default, clear toggle)

## Signature experience 1 — Musical notes everywhere
Musical notes (♪ ♫ ♬, clefs, staff lines) live around the page as the user scrolls.
Make this a SYSTEM, not decoration:
- Notes exist on 3 depth layers with parallax (near = larger, blurred; far = small, sharp).
- Scroll velocity drives them: fast scroll = notes stream and stretch; stop = they drift and settle.
- Cursor acts like a sound source: nearby notes ripple away or orbit it.
- Transitions between sections: notes gather into a 5-line staff, then the staff
  bends into a waveform, then into the earphone cable / product outline.
- In the noise-cancellation section, notes are the ONLY thing allowed to pass through
  the silence bubble (music gets in, noise does not).
- Render with Canvas/WebGL instanced particles for performance.

## Signature experience 2 — Noise cancellation scene (the hero moment)
A pinned, scroll-scrubbed scene:
1. A stylized person (elegant line-art or soft 3D silhouette, side profile) stands
   in the center. City noise surrounds them: jagged waveforms, harsh angular
   particles, glitchy text fragments ("HONK", "CHATTER", "ENGINE", "SIREN") flying
   in from all edges and hitting the person. Screen has subtle shake and grain.
2. User scrolls: the headphones slide onto the person's head (animate fit and click).
3. ANC switches ON: a soft invisible field (shader distortion / refraction bubble)
   expands around the head. Noise particles hit the field and SKIP AROUND it,
   overflowing past the person like water around a stone. Jagged waves inside the
   bubble smooth into calm sine waves.
4. Inside the bubble only musical notes float gently. Outside, the chaos continues
   but desaturates and slows.
5. Big type reveals: "−42 dB. The world, on mute."
- Reverse scroll must play it backwards cleanly.
- Add a small live "dB meter" UI that drops as ANC engages.

## Landing page — must surprise more than the product pages
Ideas to choose from or combine (you may invent better ones):
- Opening in total silence: black screen, a single pulsing dot, text "Put them on."
  First scroll/click "turns on sound" and the page blooms.
- Exploded view: the headphones assemble from 20+ floating parts (drivers, cushions,
  frame) as the user scrolls, with each part labeled in small technical type.
- Hero type made of sound: headline letters vibrate like a speaker cone, reacting to
  scroll speed and cursor.
- A "spatial audio" section where the cursor position moves a sound source around a
  3D head and visual rings show direction.

## Pages / sections
1. Landing (intro → hero reveal → ANC scene → spatial audio → design/materials →
   battery & specs → reviews → CTA)
2. Product page: SILENTIUM One (360° product view, color switcher with smooth
   material change, spec grid, compare table)
3. Product page: SILENTIUM Buds
4. Compare page
5. Simple footer, newsletter field, cart drawer (UI only, no real checkout)

## Quality bar
- 60 fps on a mid-range laptop. Use transform/opacity, will-change carefully,
  instancing for particles, lazy-load 3D and heavy sections.
- Fully responsive. On mobile, simplify scenes (fewer particles, no heavy shaders)
  but keep the story.
- Respect `prefers-reduced-motion`: show static, still beautiful versions.
- Accessible: semantic HTML, keyboard focus, real text (not only canvas), alt text,
  contrast AA.
- Lighthouse performance ≥ 85 on desktop.
- All images, 3D models, and illustrations must be original, generated, or
  free-licensed placeholders. No real brand logos or product photos.

## How to work
1. First, give me: a short design concept (mood, palette, fonts, motion principles),
   a section-by-section storyboard, and the file/folder structure. Wait for my OK.
2. Then build in phases: (a) layout + typography + smooth scroll, (b) musical-note
   particle system, (c) ANC scene, (d) landing surprises, (e) product pages,
   (f) polish + performance + reduced motion.
3. After each phase, tell me what is done and what to check.
4. If you need assets (3D model, brand name, colors, copy), ASK me or propose a
   placeholder. Do not stop the build for small decisions — make a choice and note it.