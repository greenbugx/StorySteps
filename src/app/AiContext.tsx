import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { detectBrowserCapabilities, requestPersistentStorage } from '@/lib/ai/capabilities'
import type { BrowserCapabilities } from '@/lib/ai/capabilities'
import { EXTRACTION_SYSTEM_PROMPT, parseExtraction } from '@/lib/ai/extraction'
import type { ExtractionResult } from '@/lib/ai/extraction'
import { gemmaProvider } from '@/lib/ai/gemmaProvider'
import { GEMMA_MODEL } from '@/lib/ai/modelConfig'
import {
  cachedModelBytes,
  downloadModel,
  isModelCached,
  removeCachedModel,
} from '@/lib/ai/modelStore'
import type { ModelStoreProgress } from '@/lib/ai/modelStore'
import { transcriber } from '@/lib/ai/transcriber'
import type { TranscriptionOutcome } from '@/lib/ai/transcriber'
import type { WorkerProgress } from '@/lib/ai/transcriptionProtocol'
import { db } from '@/lib/db/database'
import type { ModelRuntimeStatus } from '@/types/memory'

export type DownloadState = {
  status: ModelRuntimeStatus
  detail: string | null
  progress: ModelStoreProgress | null
  cancelling: boolean
}

export type TranscriptionState = {
  status: 'idle' | 'transcribing' | 'done' | 'error'
  detail: string | null
  progress: WorkerProgress | null
  device: 'webgpu' | 'wasm' | null
}

type AiContextValue = {
  capabilities: BrowserCapabilities | null
  refreshCapabilities: () => Promise<void>
  download: DownloadState
  downloadedBytes: number | null
  startDownload: () => Promise<void>
  cancelDownload: () => void
  removeModel: () => Promise<void>
  loadModel: () => Promise<void>
  unloadModel: () => Promise<void>
  modelLoaded: boolean
  transcription: TranscriptionState
  transcribe: (blob: Blob) => Promise<TranscriptionOutcome>
  extractMemory: (sourceText: string, onToken?: (chunk: string) => void) => Promise<ExtractionResult>
}

const AiContext = createContext<AiContextValue | null>(null)

const idleDownload: DownloadState = { status: 'not-downloaded', detail: null, progress: null, cancelling: false }
const idleTranscription: TranscriptionState = { status: 'idle', detail: null, progress: null, device: null }

export function AiProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(null)
  const [download, setDownload] = useState<DownloadState>(idleDownload)
  const [downloadedBytes, setDownloadedBytes] = useState<number | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [transcription, setTranscription] = useState<TranscriptionState>(idleTranscription)
  const downloadAbort = useRef<AbortController | null>(null)
  const generationAbort = useRef<AbortController | null>(null)

  const refreshCapabilities = useCallback(async () => {
    setCapabilities(await detectBrowserCapabilities())
  }, [])

  const persistStatus = useCallback(async (status: ModelRuntimeStatus, bytes: number | null, total: number | null) => {
    await db.modelStatus.put({
      modelId: GEMMA_MODEL.id,
      modelVersion: GEMMA_MODEL.fileName,
      status,
      downloadedBytes: bytes,
      totalBytes: total,
      lastVerifiedAt: new Date().toISOString(),
      storageStrategy: (await isModelCached()) ? 'cache-api' : 'none',
    })
  }, [])

  useEffect(() => {
    void (async () => {
      const detected = await detectBrowserCapabilities()
      setCapabilities(detected)
      if (detected.persistentStorage === 'denied') {
        await requestPersistentStorage()
        setCapabilities(await detectBrowserCapabilities())
      }
      const cached = await isModelCached()
      const bytes = cached ? await cachedModelBytes() : null
      setDownloadedBytes(bytes)
      if (cached) {
        setDownload({
          status: 'not-downloaded',
          detail: 'The model file is stored on this device.',
          progress: null,
          cancelling: false,
        })
      }
      await persistStatus('not-downloaded', bytes, GEMMA_MODEL.approxBytes)
    })()
  }, [persistStatus])

  const startDownload = useCallback(async () => {
    if (downloadAbort.current) return
    const controller = new AbortController()
    downloadAbort.current = controller
    setDownload({
      status: 'downloading',
      detail: 'Downloading the model from Hugging Face. The file stays on this device.',
      progress: { receivedBytes: 0, totalBytes: GEMMA_MODEL.approxBytes },
      cancelling: false,
    })
    await persistStatus('downloading', 0, GEMMA_MODEL.approxBytes)
    try {
      await downloadModel((progress) => {
        setDownload((current) => ({ ...current, progress }))
      }, controller.signal)
      const bytes = await cachedModelBytes()
      setDownloadedBytes(bytes)
      setDownload({ status: 'not-downloaded', detail: 'The model file is stored on this device.', progress: null, cancelling: false })
      await persistStatus('not-downloaded', bytes, GEMMA_MODEL.approxBytes)
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'The download was cancelled.'
          : error instanceof Error
            ? error.message
            : 'The model could not be downloaded.'
      setDownload({ status: 'error', detail: message, progress: null, cancelling: false })
      setDownloadedBytes(null)
      await persistStatus('error', null, GEMMA_MODEL.approxBytes)
    } finally {
      downloadAbort.current = null
    }
  }, [persistStatus])

  const cancelDownload = useCallback(() => {
    setDownload((current) => ({ ...current, cancelling: true }))
    downloadAbort.current?.abort()
  }, [])

  const removeModel = useCallback(async () => {
    await gemmaProvider.release()
    setModelLoaded(false)
    await transcriber.dispose()
    await removeCachedModel()
    setDownloadedBytes(null)
    setDownload({
      status: 'not-downloaded',
      detail: 'The model file was removed from this device.',
      progress: null,
      cancelling: false,
    })
    await persistStatus('not-downloaded', null, GEMMA_MODEL.approxBytes)
    await refreshCapabilities()
  }, [persistStatus, refreshCapabilities])

  const loadModel = useCallback(async () => {
    setDownload((current) => ({ ...current, status: 'loading', detail: 'Loading the local model.' }))
    await persistStatus('loading', downloadedBytes, GEMMA_MODEL.approxBytes)
    try {
      await gemmaProvider.load(
        (status) => setDownload((current) => ({ ...current, status: status.status, detail: status.detail })),
        { allowRemoteLoad: false },
      )
      setModelLoaded(true)
      setDownload({ status: 'ready', detail: 'The local model is loaded and stays in this tab.', progress: null, cancelling: false })
      await persistStatus('ready', downloadedBytes, GEMMA_MODEL.approxBytes)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The local model could not be loaded.'
      setModelLoaded(false)
      setDownload({ status: 'error', detail: message, progress: null, cancelling: false })
      await persistStatus('error', downloadedBytes, GEMMA_MODEL.approxBytes)
      throw error
    }
  }, [downloadedBytes, persistStatus])

  const unloadModel = useCallback(async () => {
    await gemmaProvider.release()
    setModelLoaded(false)
    setDownload((current) => ({
      ...current,
      status: 'not-downloaded',
      detail: 'The model was unloaded. The file stays stored on this device.',
    }))
    await persistStatus('not-downloaded', downloadedBytes, GEMMA_MODEL.approxBytes)
  }, [downloadedBytes, persistStatus])

  const transcribe = useCallback(async (blob: Blob) => {
    setTranscription({ status: 'transcribing', detail: 'Transcribing on this device.', progress: null, device: null })
    try {
      const outcome = await transcriber.transcribe(blob, {
        onProgress: (progress) => setTranscription((current) => ({ ...current, progress })),
        onWarning: (detail) => setTranscription((current) => ({ ...current, detail, device: 'wasm' })),
      })
      if (outcome.status === 'rejected') {
        setTranscription({ status: 'error', detail: outcome.reason, progress: null, device: null })
      } else {
        setTranscription((current) => ({ ...current, status: 'done', progress: null, device: outcome.device }))
      }
      return outcome
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed.'
      setTranscription({ status: 'error', detail: message, progress: null, device: null })
      return { status: 'rejected', reason: message } satisfies TranscriptionOutcome
    }
  }, [])

  const extractMemory = useCallback(
    async (sourceText: string, onToken?: (chunk: string) => void) => {
      const controller = new AbortController()
      generationAbort.current = controller
      setDownload((current) => ({ ...current, status: 'generating', detail: 'Reading the note with the local model.' }))
      try {
        if (!gemmaProvider.isLoaded()) await loadModel()
        const raw = await gemmaProvider.generate({
          systemPrompt: EXTRACTION_SYSTEM_PROMPT,
          userPrompt: sourceText,
          onToken,
          signal: controller.signal,
        })
        return parseExtraction(raw)
      } finally {
        generationAbort.current = null
        setDownload((current) => ({
          ...current,
          status: gemmaProvider.isLoaded() ? 'ready' : 'not-downloaded',
          detail: null,
        }))
      }
    },
    [loadModel],
  )

  const value = useMemo<AiContextValue>(
    () => ({
      capabilities,
      refreshCapabilities,
      download,
      downloadedBytes,
      startDownload,
      cancelDownload,
      removeModel,
      loadModel,
      unloadModel,
      modelLoaded,
      transcription,
      transcribe,
      extractMemory,
    }),
    [
      capabilities,
      refreshCapabilities,
      download,
      downloadedBytes,
      startDownload,
      cancelDownload,
      removeModel,
      loadModel,
      unloadModel,
      modelLoaded,
      transcription,
      transcribe,
      extractMemory,
    ],
  )

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>
}

export function useAi(): AiContextValue {
  const context = useContext(AiContext)
  if (!context) throw new Error('useAi must be used inside AiProvider')
  return context
}
