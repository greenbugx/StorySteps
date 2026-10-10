import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-paper/60 px-5 py-8">
      <h3 className="font-heading text-lg text-foreground">{title}</h3>
      <p className="max-w-prose text-sm leading-relaxed text-ink-muted">{description}</p>
      {action}
    </div>
  )
}
