import { CATEGORY_COLORS, CATEGORY_LABELS, type MemoryCategory } from '@/types/memory'

type CategoryBadgeProps = {
  category: MemoryCategory
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      <span
        aria-hidden="true"
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: CATEGORY_COLORS[category] }}
      />
      {CATEGORY_LABELS[category]}
    </span>
  )
}
