import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useArchive } from '@/app/ArchiveContext'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryBadge } from '@/components/archive/CategoryBadge'
import { formatEventDate, formatRecordedAt } from '@/lib/format'
import type { MemoryRecord } from '@/types/memory'

type TimelineEntry = {
  record: MemoryRecord
  when: string
  kind: 'recorded' | 'event'
  certain: boolean
}

export function TimelinePage() {
  const { memories } = useArchive()
  const [params, setParams] = useSearchParams()
  const place = params.get('place') ?? ''
  const [input, setInput] = useState(place)

  const entries = useMemo<TimelineEntry[]>(() => {
    const matching = memories.filter((record) => record.placeLabel === place)
    const list: TimelineEntry[] = []
    for (const record of matching) {
      list.push({ record, when: record.recordedAt, kind: 'recorded', certain: true })
      if (record.eventDate) {
        list.push({
          record,
          when: `${record.eventDate.length === 4 ? `${record.eventDate}-01-01` : record.eventDate.length === 7 ? `${record.eventDate}-01` : record.eventDate}T00:00:00.000Z`,
          kind: 'event',
          certain: !record.eventDateUncertain,
        })
      }
    }
    return list.sort((a, b) => b.when.localeCompare(a.when))
  }, [memories, place])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Timeline</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Two dates sit side by side: when you recorded something, and when it reportedly happened. They are often very
          different, and both matter.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setParams(input.trim() === '' ? {} : { place: input.trim() })
        }}
      >
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs text-ink-muted">
          Place name
          <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Old post office" />
        </label>
        <Button type="submit" variant="secondary">
          Show timeline
        </Button>
      </form>

      {place.trim() === '' ? (
        <EmptyState
          title="Pick a place"
          description="Enter a place name to see every memory recorded there. Open a memory and use its place link to jump straight in."
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title={`No memories for ${place}`}
          description="Open a memory, edit it and set a place label to build this timeline."
          action={
            <Button render={<Link to="/archive" />} variant="outline">
              Back to the archive
            </Button>
          }
        />
      ) : (
        <ol className="relative flex flex-col gap-0 border-l border-border pl-5">
          {entries.map((entry) => (
            <li key={`${entry.record.id}-${entry.kind}`} className="relative flex flex-col gap-1 border-b border-border py-3 last:border-b-0">
              <span
                aria-hidden="true"
                className={`absolute top-5 -left-[1.6rem] size-2.5 rounded-full border-2 ${
                  entry.kind === 'event' ? 'border-moss bg-paper' : 'border-ink-muted bg-ink-muted'
                }`}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={
                    entry.kind === 'event'
                      ? 'rounded-full bg-moss-soft px-2 py-0.5 text-moss'
                      : 'rounded-full border border-border px-2 py-0.5 text-ink-muted'
                  }
                >
                  {entry.kind === 'event'
                    ? `Reported to have happened${entry.certain ? '' : ', approximate date'}`
                    : 'Recorded by you'}
                </span>
                <span className="text-ink-muted">
                  {entry.kind === 'event' && entry.record.eventDate
                    ? formatEventDate(entry.record.eventDate)
                    : formatRecordedAt(entry.when)}
                </span>
              </div>
              <Link
                to={`/memories/${entry.record.id}`}
                className="font-heading text-base text-foreground hover:text-moss"
              >
                {entry.record.title}
              </Link>
              <CategoryBadge category={entry.record.category} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
