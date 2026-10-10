import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { gsap } from '../../lib/gsap'
import { productUi } from '../../content/products'
import { dragView, normaliseAngle, nudgeView, setExplode, setViewAngle, viewLive, useViewField } from './viewLive'
import type { ProductCopy } from '../../content/products'

const ui = productUi.view

/**
 * The 360° view. The model is drawn by the shared WebGL stage behind the page; this is the surface
 * you grab and the controls under it. It works with a mouse (drag), touch (horizontal drag), the
 * keyboard (arrow keys, the slider, preset buttons) — and under reduced motion nothing turns by itself.
 */
export function ProductViewer({ product }: { product: ProductCopy }) {
  const surface = useRef<HTMLDivElement>(null)
  const slider = useRef<HTMLInputElement>(null)
  const readout = useRef<HTMLOutputElement>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const exploded = useViewField((l) => l.explodeTarget > 0.5)

  // Keep the slider in step with the auto-turn without re-rendering React every frame.
  useEffect(() => {
    const tick = () => {
      const deg = Math.round((normaliseAngle(viewLive.rotY) * 180) / Math.PI) % 360
      if (slider.current && document.activeElement !== slider.current) slider.current.value = String(deg)
      if (readout.current) readout.current.textContent = `${deg}°`
    }
    tick()
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    surface.current?.setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
    viewLive.dragging = true
    viewLive.velY = 0
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const l = last.current
    if (!l) return
    dragView(e.clientX - l.x, e.pointerType === 'mouse' ? e.clientY - l.y : 0)
    last.current = { x: e.clientX, y: e.clientY }
  }
  const up = () => {
    last.current = null
    viewLive.dragging = false
    viewLive.lastInput = performance.now()
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? Math.PI / 2 : Math.PI / 12
    if (e.key === 'ArrowLeft') nudgeView(-step)
    else if (e.key === 'ArrowRight') nudgeView(step)
    else if (e.key === 'ArrowUp') setViewAngle(viewLive.targetY, viewLive.targetX - 0.12)
    else if (e.key === 'ArrowDown') setViewAngle(viewLive.targetY, viewLive.targetX + 0.12)
    else if (e.key === 'Home') setViewAngle(0, 0.08)
    else return
    e.preventDefault()
  }
  const onSlide = (deg: number) => {
    // Take the shortest way round from wherever the model is turned to now.
    const want = (deg * Math.PI) / 180
    const cur = viewLive.targetY
    const delta = ((((want - cur) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    setViewAngle(cur + delta)
  }

  return (
    <div className="relative flex h-full min-h-[24rem] flex-col">
      <div
        ref={surface}
        data-viewer
        role="group"
        tabIndex={0}
        aria-label={`${ui.group}: ${product.name}`}
        aria-describedby="viewer-alt"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        className="group relative min-h-[20rem] flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing"
      >
        <p id="viewer-alt" className="sr-only">
          {product.viewAlt}
        </p>
        {/* Corner brackets: the frame of the "technical view". */}
        {['left-0 top-0 border-l border-t', 'right-0 top-0 border-r border-t', 'left-0 bottom-0 border-l border-b', 'right-0 bottom-0 border-r border-b'].map((c) => (
          <i key={c} aria-hidden className={`pointer-events-none absolute h-4 w-4 border-bone/30 ${c}`} />
        ))}
        <p aria-hidden className="label pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-3 whitespace-nowrap opacity-70 transition-opacity group-focus-visible:opacity-100 sm:flex">
          <span>← {ui.hint} →</span>
        </p>
      </div>

      <div className="mt-4 grid gap-4 border-t hairline pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-center gap-4">
          <label htmlFor="view-rotate" className="label shrink-0">
            {ui.rotate}
          </label>
          <input
            id="view-rotate"
            ref={slider}
            type="range"
            min={0}
            max={359}
            step={1}
            defaultValue={0}
            onChange={(e) => onSlide(Number(e.target.value))}
            aria-valuetext={`${Math.round((normaliseAngle(viewLive.targetY) * 180) / Math.PI) % 360} degrees`}
            className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-bone/15 accent-[var(--color-brass)]"
          />
          <output ref={readout} htmlFor="view-rotate" className="label w-9 shrink-0 text-right tabular-nums text-bone">
            0°
          </output>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ui.presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setViewAngle(p.y + Math.round((viewLive.targetY - p.y) / (Math.PI * 2)) * Math.PI * 2, p.x)}
              className="label rounded-full border border-bone/20 px-3.5 py-2 transition-colors hover:border-bone/50 hover:text-bone"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={exploded}
            onClick={() => setExplode(!exploded)}
            className={`label rounded-full border px-4 py-2 transition-colors ${exploded ? 'border-brass bg-brass text-basalt' : 'border-brass/60 text-brass hover:border-brass'}`}
          >
            {exploded ? ui.assemble : ui.explode}
          </button>
        </div>
      </div>
    </div>
  )
}
