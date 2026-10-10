import { useEffect, useMemo, useRef, useState } from 'react'
import { List, Map as MapIcon } from 'lucide-react'
import { useArchive } from '@/app/ArchiveContext'
import { AtlasMap } from '@/components/atlas/AtlasMap'
import { MapLegend } from '@/components/atlas/MapLegend'
import { MemoryCard } from '@/components/archive/MemoryCard'
import { MemoryFilters } from '@/components/archive/MemoryFilters'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { applyMemoryQuery, emptyMemoryQuery, type MemoryQuery } from '@/lib/db/memoryRepository'
import { cn } from 'cn'

type ViewMode = 'map' | 'list'

export function AtlasPage() {
  const { memories, ready } = useArchive()
  const [query, setQuery] = useState<MemoryQuery>(emptyMemoryQuery)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('map')
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => applyMemoryQuery(memories, query), [memories, query])
  const unplaced = results.filter((record) => record.latitude === null).length

  useEffect(() => {
    if (!selectedId) return
    const node = listRef.current?.querySelector(`[data-memory-id="${selectedId}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Atlas</h1>
          <p className="text-sm text-ink-muted">
            {results.length} {results.length === 1 ? 'memory' : 'memories'} in view. OpenStreetMap tiles are community
            operated and need a connection.
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5 lg:hidden">
          <Button
            size="sm"
            variant={view === 'map' ? 'secondary' : 'ghost'}
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
          >
            <MapIcon className="size-4" />
            Map
          </Button>
          <Button
            size="sm"
            variant={view === 'list' ? 'secondary' : 'ghost'}
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            <List className="size-4" />
            List
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-3">
          <MemoryFilters query={query} onChange={setQuery} />
          <div
            className={cn(
              'overflow-hidden rounded-lg border border-border',
              view === 'list' ? 'hidden lg:block' : 'block',
            )}
          >
            <div className="h-[24rem] lg:h-[32rem]">
              <AtlasMap records={results} selectedId={selectedId} onSelect={setSelectedId} className="h-full w-full" />
            </div>
          </div>
          <MapLegend hiddenCount={unplaced} />
        </div>

        <aside
          className={cn(
            'flex flex-col overflow-hidden rounded-lg border border-border bg-paper',
            view === 'map' ? 'hidden lg:flex' : 'flex',
          )}
        >
          <div className="border-b border-border px-3 py-2 text-xs tracking-[0.12em] text-ink-muted uppercase">
            Results
          </div>
          <div ref={listRef} className="max-h-[28rem] overflow-y-auto">
            {!ready ? (
              <p className="px-3 py-4 text-sm text-ink-muted">Reading the archive on this device.</p>
            ) : results.length === 0 ? (
              <div className="p-3">
                <EmptyState
                  title="Nothing matches yet"
                  description="Adjust the search or filters, or record a memory from a field session and it will appear here."
                />
              </div>
            ) : (
              results.map((record) => (
                <MemoryCard key={record.id} record={record} selected={record.id === selectedId} />
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
