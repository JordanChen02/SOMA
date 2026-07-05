import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white rounded-3xl shadow-sm border border-zinc-100 p-5', className)}
      {...props}
    >
      {children}
    </div>
  )
}
