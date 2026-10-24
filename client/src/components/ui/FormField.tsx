import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type Props = {
  id: string
  label: string
  hint?: string
  error?: string
  children?: ReactNode
} & (InputHTMLAttributes<HTMLInputElement> | TextareaHTMLAttributes<HTMLTextAreaElement>)

export function FormField({ id, label, hint, error, children, className = '', ...inputProps }: Props) {
  return <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-semibold text-ink">{label}{inputProps.required && <span aria-hidden="true" className="ml-1 text-rose-600">*</span>}</label>
    {children ?? <input id={id} className={`field-control ${className}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...inputProps as InputHTMLAttributes<HTMLInputElement>} />}
    {error ? <p id={`${id}-error`} role="alert" className="text-xs font-medium text-rose-700">{error}</p> : hint ? <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p> : null}
  </div>
}
