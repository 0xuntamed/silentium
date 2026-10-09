import { useId, useState, type FormEvent } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import { isEmail } from '../lib/email'
import { newsletter } from '../content/copy'
import { bezier } from '../lib/easings'

type Status = 'idle' | 'error' | 'done'

/** A newsletter field. Demo only: it validates and says thanks, and sends nothing anywhere. */
export function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const id = useId()
  const msgId = `${id}-msg`

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setStatus('error')
      return
    }
    setStatus('done')
    setEmail('')
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-md">
      <h3 className="font-display text-3xl leading-none tracking-tight">{newsletter.title}</h3>
      <p className="body-l mt-3 text-[0.95rem]">{newsletter.body}</p>

      <div className="mt-6 flex items-end gap-3 border-b border-bone/30 pb-2 transition-colors focus-within:border-brass">
        <label htmlFor={id} className="sr-only">
          {newsletter.label}
        </label>
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          placeholder={newsletter.placeholder}
          aria-invalid={status === 'error'}
          aria-describedby={msgId}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status !== 'idle') setStatus('idle')
          }}
          className="min-w-0 flex-1 bg-transparent py-2 text-lg text-bone placeholder:text-fog focus:outline-none"
        />
        <button type="submit" className="label label-bone rounded-full border border-bone/25 px-5 py-3 transition-colors hover:border-brass hover:text-brass">
          {newsletter.submit}
        </button>
      </div>

      <div id={msgId} role="status" aria-live="polite" className="mt-3 min-h-[2.6rem]">
        <AnimatePresence mode="wait" initial={false}>
          {status === 'error' && (
            <m.p key="e" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: bezier.hush }} className="label text-static">
              {newsletter.invalid}
            </m.p>
          )}
          {status === 'done' && (
            <m.p key="d" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: bezier.hush }} className="label label-brass">
              {newsletter.done}
            </m.p>
          )}
          {status === 'idle' && (
            <m.p key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="label text-fog">
              {newsletter.demo}
            </m.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}
