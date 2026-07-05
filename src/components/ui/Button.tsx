'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      primary: '[background:var(--button-primary-surface)] text-[var(--on-accent)] shadow-[var(--button-primary-shadow)] hover:[background:var(--button-primary-bg-hover)] active:[background:var(--button-primary-bg-active)] active:shadow-none',
      secondary: 'border border-[var(--button-secondary-border)] [background:var(--button-secondary-surface)] text-[var(--button-secondary-fg)] shadow-[var(--button-secondary-shadow)] hover:bg-[var(--vital-fill)]',
      ghost: 'bg-transparent text-[var(--button-ghost-fg)] hover:text-[var(--button-secondary-fg)] hover:bg-[var(--vital-fill)]',
      danger: 'bg-[var(--button-danger-bg)] text-[var(--on-accent)] shadow-[var(--button-danger-shadow)] hover:bg-[var(--button-danger-bg-hover)]',
    }

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg w-full',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </span>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'
