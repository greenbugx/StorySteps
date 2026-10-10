import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MemoryQuery } from '@/lib/db/memoryRepository'
import {
  CATEGORY_LABELS,
  MEMORY_CATEGORIES,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  VERIFICATION_STATUSES,
  VERIFICATION_LABELS,
  type MemoryCategory,
  type SourceType,
  type VerificationStatus,
} from '@/types/memory'
import { cn } from 'cn'

type MemoryFiltersProps = {
  query: MemoryQuery
  onChange: (next: MemoryQuery) => void
  showCoordinates?: boolean
}

const COORDINATE_FILTER_LABELS = {
  any: 'With or without a place',
  present: 'Placed on the map',
  absent: 'No coordinates yet',
}

export function MemoryFilters({ query, onChange, showCoordinates = true }: MemoryFiltersProps) {
  const toggleCategory = (category: MemoryCategory) => {
    onChange({
      ...query,
      categories: query.categories.includes(category)
        ? query.categories.filter((value) => value !== category)
        : [...query.categories, category],
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-muted" />
        <Input
          value={query.text}
          onChange={(event) => onChange({ ...query, text: event.target.value })}
          placeholder="Search titles, notes, transcripts and places"
          aria-label="Search the archive"
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MEMORY_CATEGORIES.map((category) => {
          const active = query.categories.includes(category)
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => toggleCategory(category)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                active
                  ? 'border-moss bg-moss-soft text-moss'
                  : 'border-border bg-paper text-ink-muted hover:text-foreground',
              )}
            >
              {CATEGORY_LABELS[category]}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={query.sourceTypes[0] ?? null}
          onValueChange={(value) =>
            onChange({ ...query, sourceTypes: value ? [value as SourceType] : [] })
          }
        >
          <SelectTrigger size="sm" aria-label="Filter by source type">
            <SelectValue placeholder="Any source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_TYPES.map((sourceType) => (
              <SelectItem key={sourceType} value={sourceType}>
                {SOURCE_TYPE_LABELS[sourceType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.verificationStatuses[0] ?? null}
          onValueChange={(value) =>
            onChange({ ...query, verificationStatuses: value ? [value as VerificationStatus] : [] })
          }
        >
          <SelectTrigger size="sm" aria-label="Filter by verification">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            {VERIFICATION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {VERIFICATION_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showCoordinates ? (
          <Select
            value={query.coordinates}
            onValueChange={(value) =>
              onChange({ ...query, coordinates: value as MemoryQuery['coordinates'] })
            }
            items={COORDINATE_FILTER_LABELS}
          >
            <SelectTrigger size="sm" aria-label="Filter by location">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">With or without a place</SelectItem>
              <SelectItem value="present">Placed on the map</SelectItem>
              <SelectItem value="absent">No coordinates yet</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </div>
  )
}
