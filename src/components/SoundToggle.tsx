import * as m from 'motion/react-m'
import { toggleSound, useSoundOn } from '../lib/audio'
import { intro } from '../content/copy'
import { spring } from '../lib/easings'

/** Sound is off until the visitor asks. The toggle is always reachable. */
export function SoundToggle({ className = '' }: { className?: string }) {
  const on = useSoundOn()
  return (
    <button
      type="button"
      data-no-enter
      aria-pressed={on}
      onClick={toggleSound}
      className={`group label flex items-center gap-2.5 py-2 transition-colors hover:text-bone ${className}`}
    >
      <span className="relative block h-2 w-2" aria-hidden>
        <m.span
          className="absolute inset-0 rounded-full bg-brass"
          animate={{ scale: on ? 1 : 0.4, opacity: on ? 1 : 0.5 }}
          transition={spring}
        />
        {on && <span className="beat absolute inset-0 rounded-full border border-brass" />}
      </span>
      <span className={on ? 'label-brass' : ''}>{on ? intro.soundOn : intro.soundOff}</span>
    </button>
  )
}
