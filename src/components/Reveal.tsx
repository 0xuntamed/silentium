import type { ReactNode } from 'react'
import * as m from 'motion/react-m'
import { bezier } from '../lib/easings'

/** Fade-and-rise when scrolled into view. Transform + opacity only; Framer drops the transform under reduced motion. */
export function Reveal({ children, delay = 0, className = '', as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section' | 'dl' }) {
  const M = m[as]
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1.1, delay, ease: bezier.hush }}
    >
      {children}
    </M>
  )
}
