import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { reviews } from '../../content/copy'
import { Rail } from './Rail'

/** Ratings are noteheads on a five-line staff instead of stars. */
function StaffRating({ rating }: { rating: number }) {
  return (
    <svg viewBox="0 0 120 28" className="h-7 w-[7.5rem]" role="img" aria-label={`${rating} out of 5`}>
      {[4, 8, 12, 16, 20].map((y) => (
        <line key={y} x1="0" x2="120" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.28" strokeWidth="0.7" />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const x = 12 + i * 23
        const y = [20, 16, 12, 8, 4][i]
        const on = i < rating
        return (
          <g key={i} data-note data-on={on ? 1 : 0} opacity={on ? 1 : 0.2} className="text-brass">
            <ellipse cx={x} cy={y} rx="4.4" ry="3.2" fill="currentColor" transform={`rotate(-18 ${x} ${y})`} />
            <line x1={x + 4} x2={x + 4} y1={y - 0.5} y2={y - 14} stroke="currentColor" strokeWidth="0.9" />
          </g>
        )
      })}
    </svg>
  )
}

/** Reviews — "Listener notes". An unpinned, draggable rail of quotes; ratings are noteheads. */
export function Reviews() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el || prefersReducedMotion()) return
      ScrollTrigger.create({ id: 'scene-reviews', trigger: el, start: 'top top', end: 'bottom bottom' })
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 68%', once: true } })
      tl.from(el.querySelectorAll('[data-rise]'), { opacity: 0, y: 48, duration: 1.2, ease: 'hush', stagger: 0.1 })
        .from(el.querySelectorAll('[data-card]'), { opacity: 0, y: 56, duration: 1.2, ease: 'hush', stagger: 0.09 }, 0.25)
        // The staff fills in note by note.
        .from(el.querySelectorAll('[data-note][data-on="1"]'), { opacity: 0, y: 6, duration: 0.5, ease: 'hush', stagger: 0.04 }, 0.9)
    },
    { scope: root },
  )

  const cards = (dup: boolean) => (
    <ul className="flex shrink-0 gap-5 pr-5">
      {reviews.items.map((r) => (
        <li
          key={r.who}
          data-card={dup ? undefined : ''}
          className="flex h-[24rem] w-[min(78vw,26rem)] shrink-0 snap-start flex-col justify-between border hairline bg-basalt/60 p-7 sm:p-9"
        >
          <StaffRating rating={r.rating} />
          <blockquote>
            <p className="font-display text-[clamp(1.7rem,2.6vw,2.4rem)] leading-[1.05] tracking-[-0.015em]">“{r.quote}”</p>
            <footer className="mt-7">
              <p className="label label-bone">{r.who}</p>
              <p className="label mt-1">{r.role}</p>
            </footer>
          </blockquote>
        </li>
      ))}
    </ul>
  )

  return (
    <section ref={root} id="reviews" aria-labelledby="reviews-title" className="relative overflow-x-clip px-[var(--gutter)] py-[clamp(5rem,12vw,10rem)]">
      <div data-rise className="mb-10 flex items-center gap-3">
        <span className="label label-brass">{reviews.index}</span>
        <span className="h-px w-8 bg-bone/20" aria-hidden />
        <span className="label">{reviews.label}</span>
      </div>
      <h2 id="reviews-title" data-rise className="display-l mb-14">
        {reviews.title[0]} <em>{reviews.title[1]}</em>
      </h2>

      <Rail label={reviews.railLabel} render={cards} />
      <p data-rise className="label mt-6 text-fog">
        {reviews.note}
      </p>
    </section>
  )
}
