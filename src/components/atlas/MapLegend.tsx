import { CATEGORY_COLORS, CATEGORY_LABELS, MEMORY_CATEGORIES } from '@/types/memory'

export function MapLegend({ hiddenCount }: { hiddenCount: number }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border bg-paper/80 px-3 py-2">
      <p className="text-[0.68rem] tracking-[0.12em] text-ink-muted uppercase">Legend</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-muted">
        {MEMORY_CATEGORIES.map((category) => (
          <li key={category} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[category] }}
            />
            {CATEGORY_LABELS[category]}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <p className="text-xs text-ink-muted">
          {hiddenCount} {hiddenCount === 1 ? 'record has' : 'records have'} no coordinates, so they are not on the
          map.
        </p>
      ) : null}
    </div>
  )
}
