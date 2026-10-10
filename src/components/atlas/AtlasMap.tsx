import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression, LatLngTuple } from 'leaflet'
import { createMemoryIcon, createPickIcon } from '@/components/atlas/mapMarkers'
import { CATEGORY_LABELS, type MemoryRecord } from '@/types/memory'
import { cn } from 'cn'

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors'

type AtlasMapProps = {
  records: MemoryRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
  picking?: boolean
  onPick?: (latitude: number, longitude: number) => void
  draftPosition?: LatLngExpression | null
  className?: string
}

function TileStatus({ onUnavailable }: { onUnavailable: (unavailable: boolean) => void }) {
  const map = useMap()
  useEffect(() => {
    const handleTileError = () => onUnavailable(true)
    const handleTileLoad = () => onUnavailable(false)
    map.on('tileerror', handleTileError)
    map.on('tileload', handleTileLoad)
    return () => {
      map.off('tileerror', handleTileError)
      map.off('tileload', handleTileLoad)
    }
  }, [map, onUnavailable])
  return null
}

function ResizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const refresh = () => map.invalidateSize()
    const observer = new ResizeObserver(refresh)
    observer.observe(map.getContainer())
    requestAnimationFrame(refresh)
    return () => observer.disconnect()
  }, [map])
  return null
}

function ClickCapture({ picking, onPick }: { picking: boolean; onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      if (picking) onPick?.(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function Recentre({ records, selectedId }: { records: MemoryRecord[]; selectedId: string | null }) {
  const map = useMap()
  useEffect(() => {
    const selected = records.find((record) => record.id === selectedId)
    if (selected?.latitude !== null && selected?.latitude !== undefined && selected?.longitude !== null && selected?.longitude !== undefined) {
      map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 13), { animate: true })
      return
    }
    const points = records
      .filter((record) => record.latitude !== null && record.longitude !== null)
      .map((record) => [record.latitude as number, record.longitude as number] as LatLngTuple)
    if (points.length > 0) {
      map.fitBounds(points, { padding: [48, 48], maxZoom: 14 })
    }
  }, [map, records, selectedId])
  return null
}

export function AtlasMap({
  records,
  selectedId,
  onSelect,
  picking = false,
  onPick,
  draftPosition,
  className,
}: AtlasMapProps) {
  const [tilesUnavailable, setTilesUnavailable] = useState(false)
  const placed = useMemo(
    () => records.filter((record) => record.latitude !== null && record.longitude !== null),
    [records],
  )
  const center: LatLngExpression = placed[0]
    ? [placed[0].latitude as number, placed[0].longitude as number]
    : [26.1445, 91.7362]

  return (
    <div className={cn('relative', className)}>
      <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full" zoomControl>
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
        <TileStatus onUnavailable={setTilesUnavailable} />
        <ClickCapture picking={picking} onPick={onPick} />
        <ResizeWatcher />
        <Recentre records={placed} selectedId={selectedId} />
        {placed.map((record) => (
          <Marker
            key={record.id}
            position={[record.latitude as number, record.longitude as number]}
            icon={createMemoryIcon(record.category, record.id === selectedId)}
            eventHandlers={{ click: () => onSelect(record.id) }}
          >
            <Popup>
              <span className="font-heading text-sm">{record.title}</span>
              <br />
              <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[record.category]}</span>
            </Popup>
          </Marker>
        ))}
        {draftPosition ? <Marker position={draftPosition} icon={createPickIcon()} interactive={false} /> : null}
      </MapContainer>
      {tilesUnavailable ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 z-[500] mx-auto w-fit rounded-full border border-border bg-paper/95 px-3 py-1 text-xs text-ink-muted">
          Map tiles are unavailable right now. Saved places and notes are still listed here.
        </p>
      ) : null}
    </div>
  )
}
