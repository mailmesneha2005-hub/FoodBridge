import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type BaseProps = { children: ReactNode; variant?: 'primary' | 'secondary' | 'quiet'; className?: string }
type Props = BaseProps & ({ to: string; href?: never } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> | { href: string; to?: never } & AnchorHTMLAttributes<HTMLAnchorElement> | { to?: never; href?: never } & ButtonHTMLAttributes<HTMLButtonElement>)
export function Button({ children, to, href, variant = 'primary', className = '', ...props }: Props) {
  const classes = `${variant === 'primary' ? 'button-primary' : variant === 'secondary' ? 'button-secondary' : 'button-quiet'} ${className}`
  if (href) return <a className={classes} href={href} onClick={props.onClick as MouseEventHandler<HTMLAnchorElement>} aria-label={props['aria-label']}>{children}</a>
  if (to) return <Link className={classes} to={to} onClick={props.onClick as MouseEventHandler<HTMLAnchorElement>} aria-label={props['aria-label']}>{children}</Link>
  return <button className={classes} {...props as ButtonHTMLAttributes<HTMLButtonElement>}>{children}</button>
}
