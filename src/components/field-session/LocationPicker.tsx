import { useState } from 'react'
import { AtlasMap } from '@/components/atlas/AtlasMap'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestCurrentPosition } from '@/lib/audio/recorder'
import { formatCoordinate } from '@/lib/format'
import { latitudeSchema, longitudeSchema } from '@/lib/validation/schemas'

export type LocationValue = {
  latitude: number | null
  longitude: number | null
  precision: 'device' | 'manual-estimate' | null
}

type LocationPickerProps = {
  value: LocationValue
  onChange: (value: LocationValue) => void
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [picking, setPicking] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [latitudeInput, setLatitudeInput] = useState(value.latitude === null ? '' : String(value.latitude))
  const [longitudeInput, setLongitudeInput] = useState(value.longitude === null ? '' : String(value.longitude))

  const latitude = Number(latitudeInput)
  const longitude = Number(longitudeInput)
  const latitudeValid = latitudeInput.trim() !== '' && latitudeSchema.safeParse(latitude).success
  const longitudeValid = longitudeInput.trim() !== '' && longitudeSchema.safeParse(longitude).success
  const typedError =
    latitudeInput.trim() === '' && longitudeInput.trim() === ''
      ? null
      : latitudeValid && longitudeValid
        ? null
        : 'Enter both latitude and longitude, and keep them inside the usual ranges.'

  const applyTypedCoordinates = () => {
    if (!latitudeValid || !longitudeValid) return
    onChange({ latitude, longitude, precision: 'manual-estimate' })
    setStatus('Coordinates typed by hand. Treat them as an estimate.')
  }

  const readDeviceLocation = async () => {
    setBusy(true)
    setStatus('Asking this browser for your location.')
    try {
      const position = await requestCurrentPosition()
      onChange({ latitude: position.latitude, longitude: position.longitude, precision: 'device' })
      setLatitudeInput(position.latitude.toFixed(5))
      setLongitudeInput(position.longitude.toFixed(5))
      setStatus(`Location captured to within about ${Math.round(position.accuracyMeters)} metres.`)
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'The location could not be read.')
    } finally {
      setBusy(false)
    }
  }

  const clearLocation = () => {
    onChange({ latitude: null, longitude: null, precision: null })
    setLatitudeInput('')
    setLongitudeInput('')
    setStatus('Location removed from this memory.')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void readDeviceLocation()} disabled={busy}>
          {busy ? 'Locating' : 'Use my current location'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPicking((current) => !current)}>
          {picking ? 'Stop picking on the map' : 'Pick on the map'}
        </Button>
        {value.latitude !== null ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearLocation}>
            Remove place
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-ink-muted">
        Location is only requested when you press the button. Memories work without a place, and anything typed or picked
        by hand is stored as an estimate.
      </p>

      {status ? <p className="text-xs text-ink-muted">{status}</p> : null}

      <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Latitude
          <Input
            inputMode="decimal"
            value={latitudeInput}
            placeholder="26.14450"
            aria-label="Latitude"
            aria-invalid={typedError ? true : undefined}
            onChange={(event) => setLatitudeInput(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Longitude
          <Input
            inputMode="decimal"
            value={longitudeInput}
            placeholder="91.73620"
            aria-label="Longitude"
            aria-invalid={typedError ? true : undefined}
            onChange={(event) => setLongitudeInput(event.target.value)}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!latitudeValid || !longitudeValid}
          onClick={applyTypedCoordinates}
        >
          Use these coordinates
        </Button>
      </div>

      {typedError ? <p className="text-xs text-destructive">{typedError}</p> : null}

      {value.latitude !== null && value.longitude !== null ? (
        <p className={value.precision === 'device' ? 'text-xs text-ink-muted' : 'text-xs text-ochre'}>
          {formatCoordinate(value.latitude, 'N', 'S')}, {formatCoordinate(value.longitude, 'E', 'W')}
          {value.precision === 'device'
            ? ' from this device.'
            : value.precision === 'manual-estimate'
              ? ', entered by hand. Treat it as an estimate, not an exact position.'
              : '.'}
        </p>
      ) : null}

      {picking ? (
        <div className="h-64 overflow-hidden rounded-lg border border-border">
          <AtlasMap
            records={[]}
            selectedId={null}
            onSelect={() => undefined}
            picking
            onPick={(latitude, longitude) => {
              onChange({ latitude, longitude, precision: 'manual-estimate' })
              setLatitudeInput(latitude.toFixed(5))
              setLongitudeInput(longitude.toFixed(5))
              setPicking(false)
              setStatus('Place taken from the map. Treat it as an estimate.')
            }}
            draftPosition={
              value.latitude !== null && value.longitude !== null ? [value.latitude, value.longitude] : null
            }
            className="h-full w-full"
          />
        </div>
      ) : null}
    </div>
  )
}
