import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from '../lib/router'

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  /** Scene to scroll to after landing on `/`. */
  scene?: string
}

/** A real anchor (middle-click, copy link and no-JS work) that navigates through the router. */
export function Link({ to, scene, onClick, children, ...rest }: Props) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to, { scene })
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
