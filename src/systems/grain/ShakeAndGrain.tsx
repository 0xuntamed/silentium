import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { ancLive } from '../../scenes/ANC/live'

const TILE = 128

/**
 * Handheld camera shake and film grain, both scaled by the ANC scene's `noise` level — loudest in
 * the chaos, gone once the field is up. Transform and opacity only.
 */
export function ShakeAndGrain() {
  const grain = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = grain.current!
    // A tiling noise texture, rendered once — off the critical path, and encoded off the main thread.
    let url = ''
    let cancelled = false
    const make = () => {
      const c = document.createElement('canvas')
      c.width = c.height = TILE
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      const img = ctx.createImageData(TILE, TILE)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = 255
      }
      ctx.putImageData(img, 0, 0)
      c.toBlob((blob) => {
        if (!blob || cancelled) return
        url = URL.createObjectURL(blob)
        el.style.backgroundImage = `url(${url})`
      })
    }
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void }
    const idle = w.requestIdleCallback ? w.requestIdleCallback(make, { timeout: 4000 }) : window.setTimeout(make, 1500)

    const fine = window.matchMedia('(pointer: fine)').matches
    const maxShake = fine ? 3.4 : 1.6
    let lastStep = 0
    let shaking = false
    const targets = () =>
      [
        document.getElementById('gl-layer'),
        document.getElementById('near-layer'),
        document.querySelector<HTMLElement>('#anc .scene-inner'),
      ].filter(Boolean) as HTMLElement[]

    const tick = (time: number) => {
      const level = ancLive.active ? ancLive.state.noise * ancLive.vis : 0
      const amp = level * maxShake
      if (amp > 0.02) {
        const x = (Math.sin(time * 47.3) + Math.sin(time * 21.1 + 1.7) + (Math.random() - 0.5) * 1.6) * 0.5 * amp
        const y = (Math.sin(time * 39.7 + 0.4) + Math.sin(time * 17.3 + 2.2) + (Math.random() - 0.5) * 1.6) * 0.5 * amp
        const t = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
        for (const n of targets()) n.style.transform = t
        shaking = true
      } else if (shaking) {
        for (const n of targets()) n.style.transform = ''
        shaking = false
      }
      // Grain: hop the tile around a few times a second; opacity follows the noise level.
      el.style.opacity = String(Math.min(0.2, level * 0.13))
      if (time - lastStep > 0.07) {
        lastStep = time
        el.style.transform = `translate3d(${(-Math.random() * TILE).toFixed(0)}px, ${(-Math.random() * TILE).toFixed(0)}px, 0)`
      }
    }
    gsap.ticker.add(tick)
    return () => {
      cancelled = true
      w.cancelIdleCallback?.(idle)
      window.clearTimeout(idle)
      if (url) URL.revokeObjectURL(url)
      gsap.ticker.remove(tick)
      for (const n of targets()) n.style.transform = ''
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden" style={{ mixBlendMode: 'overlay' }}>
      <div
        ref={grain}
        className="absolute -left-[128px] -top-[128px] h-[calc(100%+256px)] w-[calc(100%+256px)]"
        style={{ opacity: 0 }}
      />
    </div>
  )
}
