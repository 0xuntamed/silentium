import { productCopy } from '../content/products'
import type { ProductId } from '../lib/cart'

/** Original line drawings (no photos): the band and cups of One, the open case and buds of Buds. */
export function Silhouette({ id, className = 'h-24 w-auto sm:h-32', decorative = false }: { id: ProductId; className?: string; decorative?: boolean }) {
  return (
    <svg viewBox="0 0 160 110" {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `${productCopy[id].name}, line drawing` })} className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {id === 'one' ? (
          <>
            <path d="M30 70 C30 14 130 14 130 70" />
            <path d="M36 70 C36 22 124 22 124 70" opacity=".4" />
            <rect x="18" y="58" width="26" height="40" rx="12" />
            <rect x="116" y="58" width="26" height="40" rx="12" />
            <circle cx="31" cy="78" r="4" stroke="var(--color-brass)" />
            <circle cx="129" cy="78" r="4" stroke="var(--color-brass)" />
          </>
        ) : (
          <>
            <rect x="34" y="62" width="92" height="38" rx="16" />
            <path d="M34 70 C34 40 126 40 126 70" opacity=".5" />
            <path d="M34 62 L42 24 C60 14 118 14 126 24" opacity=".7" />
            <ellipse cx="58" cy="50" rx="10" ry="11" />
            <ellipse cx="102" cy="50" rx="10" ry="11" />
            <path d="M58 61 V70 M102 61 V70" />
            <circle cx="80" cy="92" r="2" stroke="var(--color-brass)" />
          </>
        )}
      </g>
    </svg>
  )
}
