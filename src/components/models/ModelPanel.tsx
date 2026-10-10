import { useAi } from '@/app/AiContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatBytes, GEMMA_MODEL, WHISPER_MODEL } from '@/lib/ai/modelConfig'

const STATUS_TEXT: Record<string, string> = {
  unsupported: 'Not supported on this device',
  'not-downloaded': 'Not downloaded',
  downloading: 'Downloading',
  ready: 'Loaded and ready',
  loading: 'Loading into memory',
  generating: 'Writing a response',
  error: 'Something went wrong',
  'storage-limited': 'Not enough storage',
}

export function ModelPanel() {
  const { capabilities, download, downloadedBytes, startDownload, cancelDownload, removeModel, loadModel, unloadModel, modelLoaded } =
    useAi()
  const progress =
    download.progress && download.progress.totalBytes
      ? Math.min(100, Math.round((download.progress.receivedBytes / download.progress.totalBytes) * 100))
      : null
  const downloading = download.status === 'downloading'
  const storageBlocked = download.status === 'storage-limited'
  const webGpuBlocked = capabilities?.webGpu === 'unavailable'

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-paper px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg">Local models</h2>
        <span className="text-xs text-ink-muted">{STATUS_TEXT[download.status] ?? download.status}</span>
      </div>

      <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
        Model files are downloaded from Hugging Face only when you ask for them, then read from this browser for
        inference. Nothing is uploaded, and there is no cloud fallback.
      </p>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border px-3 py-2">
          <dt className="text-sm font-medium">{GEMMA_MODEL.label}</dt>
          <dd className="text-xs text-ink-muted">
            {GEMMA_MODEL.purpose}. About {formatBytes(GEMMA_MODEL.approxBytes)}.{' '}
            {downloadedBytes !== null ? `Stored: ${formatBytes(downloadedBytes)}.` : 'Not stored on this device yet.'}
          </dd>
          <dd className="mt-1 text-xs text-ink-muted">
            {GEMMA_MODEL.license}.{' '}
            <a
              className="text-moss underline underline-offset-2"
              href={GEMMA_MODEL.licenseUrl}
              target="_blank"
              rel="noreferrer"
            >
              Model card
            </a>
          </dd>
        </div>
        <div className="rounded-md border border-border px-3 py-2">
          <dt className="text-sm font-medium">{WHISPER_MODEL.label}</dt>
          <dd className="text-xs text-ink-muted">
            {WHISPER_MODEL.purpose}. About {formatBytes(WHISPER_MODEL.approxBytes)}, fetched the first time you
            transcribe and then cached by the browser.
          </dd>
          <dd className="mt-1 text-xs text-ink-muted">
            {WHISPER_MODEL.license}.{' '}
            <a
              className="text-moss underline underline-offset-2"
              href={WHISPER_MODEL.licenseUrl}
              target="_blank"
              rel="noreferrer"
            >
              Model card
            </a>
          </dd>
        </div>
      </dl>

      {downloading ? (
        <div className="flex flex-col gap-2">
          <Progress value={progress ?? 0} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <span>
              {formatBytes(download.progress?.receivedBytes ?? 0)} of about{' '}
              {formatBytes(download.progress?.totalBytes ?? GEMMA_MODEL.approxBytes)}
            </span>
            <Button size="xs" variant="outline" onClick={cancelDownload} disabled={download.cancelling}>
              {download.cancelling ? 'Cancelling' : 'Cancel download'}
            </Button>
          </div>
        </div>
      ) : null}

      {download.detail ? <p className="text-sm text-ink-muted">{download.detail}</p> : null}

      {storageBlocked ? (
        <p className="text-sm text-destructive">
          The browser refused to store the model. Free up space or delete other records, then try again.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!downloading ? (
          <Button size="sm" onClick={() => void startDownload()} disabled={!capabilities?.cacheStorage}>
            {downloadedBytes !== null ? 'Download again' : 'Download model'}
          </Button>
        ) : null}
        {downloadedBytes !== null && !modelLoaded ? (
          <Button size="sm" variant="secondary" onClick={() => void loadModel().catch(() => undefined)}>
            Load into memory
          </Button>
        ) : null}
        {modelLoaded ? (
          <Button size="sm" variant="outline" onClick={() => void unloadModel()}>
            Unload model
          </Button>
        ) : null}
        {downloadedBytes !== null ? (
          <Button size="sm" variant="ghost" onClick={() => void removeModel()}>
            Delete model from this device
          </Button>
        ) : null}
      </div>

      {webGpuBlocked ? (
        <p className="text-xs text-destructive">
          WebGPU is unavailable here, so local AI cannot run in this browser. {capabilities.webGpuReason} Notes,
          archive and export all keep working.
        </p>
      ) : (
        <p className="text-xs text-ink-muted">
          LiteRT-LM reads the model on this page rather than in a background worker, so the interface can pause briefly
          while it loads or writes. Transcription runs in a worker and stays off the main thread.
        </p>
      )}
    </section>
  )
}
