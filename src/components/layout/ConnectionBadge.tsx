import { useEffect, useState } from 'react'
import { CloudOff, Cpu, MapPin } from 'lucide-react'
import { useAi } from '@/app/AiContext'
import { cn } from 'cn'

export function ConnectionBadge() {
  const { capabilities, download, downloadedBytes } = useAi()
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const modelReady = download.status === 'ready' || download.status === 'generating'
  const modelStored = downloadedBytes !== null || download.status === 'downloading'

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-1',
          online ? 'border-border bg-paper text-ink-muted' : 'border-moss/40 bg-moss-soft text-moss',
        )}
      >
        {online ? <MapPin className="size-3" /> : <CloudOff className="size-3" />}
        {online ? 'Online' : 'Offline, records still available'}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-1',
          modelReady ? 'border-moss/40 bg-moss-soft text-moss' : 'border-border bg-paper text-ink-muted',
        )}
        title={
          capabilities?.webGpu === 'unavailable'
            ? `Local AI is unavailable on this device. ${capabilities.webGpuReason ?? ''}`
            : undefined
        }
      >
        <Cpu className="size-3" />
        {modelReady ? 'Local AI ready' : modelStored ? 'Local AI stored' : 'Local AI not downloaded'}
      </span>
    </div>
  )
}
