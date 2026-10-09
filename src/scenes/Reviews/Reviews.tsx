import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { reviews } from '../../content/copy'

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
          <g key={i} opacity={on ? 1 : 0.2} className="text-brass">
            <ellipse cx={x} cy={y} rx="4.4" ry="3.2" fill="currentColor" transform={`rotate(-18 ${x} ${y})`} />
            <line x1={x + 4} x2={x + 4} y1={y - 0.5} y2={y - 14} stroke="currentColor" strokeWidth="0.9" />
          </g>
        )
      })}
    </svg>
  )
}

/** Reviews — "Listener notes". Unpinned; Phase 5 turns the rail into a draggable drift. */
export function Reviews() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el || prefersReducedMotion()) return
      ScrollTrigger.create({ id: 'scene-reviews', trigger: el, start: 'top top', end: 'bottom bottom' })
      gsap.from(el.querySelectorAll('[data-card]'), {
        opacity: 0,
        y: 56,
        duration: 1.2,
        ease: 'hush',
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 65%', once: true },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="reviews" aria-labelledby="reviews-title" className="relative px-[var(--gutter)] py-[clamp(5rem,12vw,10rem)]">
      <div className="mb-14 flex items-center gap-3">
        <span className="label label-brass">{reviews.index}</span>
        <span className="h-px w-8 bg-bone/20" aria-hidden />
        <span className="label">{reviews.label}</span>
      </div>
      <h2 id="reviews-title" className="sr-only">
        {reviews.label}
      </h2>

      <ul className="grid gap-px overflow-hidden border-y hairline bg-bone/10 md:grid-cols-3">
        {reviews.items.map((r) => (
          <li key={r.who} data-card className="flex min-h-[22rem] flex-col justify-between bg-basalt p-7 sm:p-9 md:min-h-[30rem]">
            <StaffRating rating={r.rating} />
            <blockquote>
              <p className="display-m text-[clamp(1.9rem,3vw,3rem)] leading-[1.02]">“{r.quote}”</p>
              <footer className="mt-8">
                <p className="label label-bone">{r.who}</p>
                <p className="label mt-1">{r.role}</p>
              </footer>
            </blockquote>
          </li>
        ))}
      </ul>
      <p className="label mt-5 text-fog">{reviews.note}</p>
    </section>
  )
}
