import { forwardRef, type ReactNode } from 'react'

interface Props {
  id: string
  index: string
  label: string
  children: ReactNode
  /** A hairline progress bar sits at the foot of pinned scenes. */
  progress?: boolean
  className?: string
  labelledBy?: string
}

/** A full-viewport stage with the technical chrome shared by every scene. */
export const Scene = forwardRef<HTMLElement, Props>(function Scene(
  { id, index, label, children, progress = true, className = '', labelledBy },
  ref,
) {
  return (
    <section id={id} ref={ref} className={`scene ${className}`} aria-labelledby={labelledBy}>
      <div className="scene-inner">
        <div className="absolute left-[var(--gutter)] top-[5.25rem] z-10 flex items-center gap-3">
          <span className="label label-brass">{index}</span>
          <span className="h-px w-8 bg-bone/20" aria-hidden />
          <span className="label">{label}</span>
        </div>
        <i className="reg left-[var(--gutter)] bottom-[var(--gutter)] -translate-x-1/2 translate-y-1/2" aria-hidden />
        <i className="reg right-[var(--gutter)] bottom-[var(--gutter)] translate-x-1/2 translate-y-1/2" aria-hidden />
        {children}
      </div>
      {progress && (
        <div className="absolute inset-x-0 bottom-0 h-px bg-bone/10" aria-hidden>
          <div data-progress className="h-full origin-left bg-brass" style={{ transform: 'scaleX(0)' }} />
        </div>
      )}
    </section>
  )
})
