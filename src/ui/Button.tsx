import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-surface-2 text-fg hover:bg-line',
  ghost: 'bg-transparent text-muted hover:text-fg',
  danger: 'bg-surface-2 text-danger hover:bg-line',
}

const sizes: Record<Size, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-6 text-base',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', full = false) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase tracking-wide',
    'transition-colors active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
    variants[variant],
    sizes[size],
    full ? 'w-full' : '',
  ].join(' ')
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; full?: boolean }

export function Button({ variant, size, full, className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`${buttonClass(variant, size, full)} ${className}`} {...rest} />
}
