import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useArchive } from '@/app/ArchiveContext'
import { MemoryCard } from '@/components/archive/MemoryCard'
import { MemoryFilters } from '@/components/archive/MemoryFilters'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { applyMemoryQuery, emptyMemoryQuery, type MemoryQuery } from '@/lib/db/memoryRepository'

export function ArchivePage() {
  const { memories, ready } = useArchive()
  const [query, setQuery] = useState<MemoryQuery>(emptyMemoryQuery)
  const results = useMemo(() => applyMemoryQuery(memories, query), [memories, query])
  const withCoordinates = results.filter((record) => record.latitude !== null).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Archive</h1>
          <p className="text-sm text-ink-muted">
            {results.length} {results.length === 1 ? 'record' : 'records'}, {withCoordinates} placed on the map.
            Everything here is stored in this browser.
          </p>
        </div>
        <Button render={<Link to="/field" />}>
          <Plus className="size-4" />
          New field session
        </Button>
      </div>

      <MemoryFilters query={query} onChange={setQuery} showCoordinates={false} />

      {!ready ? (
        <p className="text-sm text-ink-muted">Reading the archive on this device.</p>
      ) : results.length === 0 ? (
        <EmptyState
          title={memories.length === 0 ? 'The archive is empty' : 'Nothing matches those filters'}
          description={
            memories.length === 0
              ? 'Start a field session to write down what you saw or heard. Notes are saved on this device straight away, no AI needed.'
              : 'Clear the search or widen the filters to see more records.'
          }
          action={
            <Button render={<Link to="/field" />} variant="outline">
              <Plus className="size-4" />
              Start a field session
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-paper">
          {results.map((record) => (
            <MemoryCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  )
}
