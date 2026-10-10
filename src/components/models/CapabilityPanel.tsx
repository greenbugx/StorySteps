import { useEffect } from 'react'
import { useAi } from '@/app/AiContext'
import { Button } from '@/components/ui/button'
import { requestPersistentStorage } from '@/lib/ai/capabilities'
import { formatBytes } from '@/lib/ai/modelConfig'

export function CapabilityPanel() {
  const { capabilities, refreshCapabilities } = useAi()

  useEffect(() => {
    void refreshCapabilities()
  }, [refreshCapabilities])

  if (!capabilities) {
    return <p className="text-sm text-ink-muted">Checking what this browser can do.</p>
  }

  const rows: { label: string; value: string; detail?: string }[] = [
    {
      label: 'WebGPU',
      value: capabilities.webGpu === 'available' ? 'Available' : 'Not available',
      detail: capabilities.webGpuReason ?? undefined,
    },
    {
      label: 'Secure context',
      value: capabilities.secureContext ? 'Yes' : 'No',
      detail: capabilities.secureContext ? undefined : 'Microphone and service workers need https or localhost.',
    },
    {
      label: 'IndexedDB',
      value: capabilities.indexedDb ? 'Available' : 'Not available',
    },
    {
      label: 'Cache storage',
      value: capabilities.cacheStorage ? 'Available' : 'Not available',
      detail: capabilities.cacheStorage ? undefined : 'Model files cannot be kept on this device without it.',
    },
    {
      label: 'Offline cache',
      value: capabilities.serviceWorker ? 'Registered' : 'Unavailable',
    },
    {
      label: 'Storage in use',
      value:
        capabilities.storageEstimate.usage !== null ? formatBytes(capabilities.storageEstimate.usage) : 'Not reported',
      detail:
        capabilities.storageEstimate.quota !== null
          ? `Browser allows about ${formatBytes(capabilities.storageEstimate.quota)} in total.`
          : undefined,
    },
    {
      label: 'Persistent storage',
      value:
        capabilities.persistentStorage === 'granted'
          ? 'Granted'
          : capabilities.persistentStorage === 'denied'
            ? 'Not granted yet'
            : capabilities.persistentStorage === 'unsupported'
              ? 'Not supported'
              : 'Unknown',
      detail: 'Even when granted, the browser can still clear site data when it runs out of space.',
    },
    {
      label: 'Microphone',
      value: capabilities.micSupported ? 'Available' : 'Not available',
    },
    {
      label: 'Geolocation',
      value: capabilities.geolocationSupported ? 'Available' : 'Not available',
    },
  ]

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-paper px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg">This browser</h2>
        <Button size="xs" variant="ghost" onClick={() => void refreshCapabilities()}>
          Check again
        </Button>
      </div>

      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
            <dt className="w-48 shrink-0 text-xs text-ink-muted">{row.label}</dt>
            <dd className="text-sm">
              {row.value}
              {row.detail ? <span className="block text-xs text-ink-muted">{row.detail}</span> : null}
            </dd>
          </div>
        ))}
      </dl>

      {capabilities.persistentStorage === 'denied' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void requestPersistentStorage().then(() => refreshCapabilities())
            }}
          >
            Ask the browser to keep this data
          </Button>
          <p className="text-xs text-ink-muted">
            The browser decides. Nothing here is encrypted, and clearing site data deletes every record.
          </p>
        </div>
      ) : null}
    </section>
  )
}
