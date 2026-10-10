import { Link } from 'react-router-dom'
import { AudioLines, MapPin } from 'lucide-react'
import { CategoryBadge } from '@/components/archive/CategoryBadge'
import { formatRecordedAt, formatEventDate } from '@/lib/format'
import { SOURCE_TYPE_LABELS, VERIFICATION_LABELS, type MemoryRecord } from '@/types/memory'
import { cn } from 'cn'

type MemoryCardProps = {
  record: MemoryRecord
  selected?: boolean
  compact?: boolean
}

export function MemoryCard({ record, selected = false, compact = false }: MemoryCardProps) {
  return (
    <Link
      to={`/memories/${record.id}`}
      data-memory-id={record.id}
      className={cn(
        'group block border-l-2 px-3 py-3 transition-colors hover:bg-muted/60',
        selected ? 'border-l-moss bg-moss-soft/60' : 'border-l-transparent',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base leading-snug text-foreground group-hover:text-moss">{record.title}</h3>
        <span
          className={cn(
            'shrink-0 text-[0.68rem] tracking-wide uppercase',
            record.verificationStatus === 'corroborated'
              ? 'text-moss'
              : record.verificationStatus === 'disputed'
                ? 'text-destructive'
                : 'text-ink-muted',
          )}
        >
          {VERIFICATION_LABELS[record.verificationStatus]}
        </span>
      </div>
      {!compact && record.summary ? (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">{record.summary}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <CategoryBadge category={record.category} />
        <span>Recorded {formatRecordedAt(record.recordedAt)}</span>
        {record.eventDate ? <span>Event {formatEventDate(record.eventDate)}</span> : null}
        {record.placeLabel ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {record.placeLabel}
          </span>
        ) : null}
        {record.audioId ? <AudioLines className="size-3.5" aria-label="Has an attached recording" /> : null}
        <span className="text-ink-muted/80">{SOURCE_TYPE_LABELS[record.sourceType]}</span>
      </div>
    </Link>
  )
}
