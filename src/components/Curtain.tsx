import * as m from 'motion/react-m'
import { bezier } from '../lib/easings'
import { COVER_MS, useRouter } from '../lib/router'

/** The page-change curtain: basalt fades over the page, the route swaps behind it, then it lifts. */
export function Curtain() {
  const { phase } = useRouter()
  const covered = phase === 'covering'
  return (
    <m.div
      aria-hidden
      className="fixed inset-0 z-[150] bg-basalt"
      style={{ pointerEvents: phase === 'idle' ? 'none' : 'auto' }}
      initial={false}
      animate={{ opacity: covered ? 1 : 0 }}
      transition={covered ? { duration: COVER_MS / 1000, ease: bezier.exhale } : { duration: 0.7, ease: bezier.hush, delay: 0.1 }}
    />
  )
}
