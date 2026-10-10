import { assessRecording, decodeAudioBlob } from '@/lib/audio/decode'
import type { WorkerProgress, TranscriptionRequest, TranscriptionResponse } from '@/lib/ai/transcriptionProtocol'

export type TranscriptionOutcome =
  | { status: 'transcribed'; text: string; device: 'webgpu' | 'wasm' | null }
  | { status: 'rejected'; reason: string }

export class TranscriptionFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TranscriptionFailedError'
  }
}

export class LocalTranscriber {
  private worker: Worker | null = null

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    this.worker = new Worker(new URL('../../workers/transcription.worker.ts', import.meta.url), {
      type: 'module',
    })
    return this.worker
  }

  async transcribe(
    blob: Blob,
    handlers: {
      onProgress?: (progress: WorkerProgress) => void
      onWarning?: (message: string) => void
    } = {},
    language: string | null = null,
  ): Promise<TranscriptionOutcome> {
    const decoded = await decodeAudioBlob(blob)
    const verdict = assessRecording(decoded, blob.size)
    if (!verdict.usable) {
      return { status: 'rejected', reason: verdict.reason }
    }

    const worker = this.ensureWorker()
    const settled = Promise.withResolvers<TranscriptionResponse>()
    const onMessage = (event: MessageEvent<TranscriptionResponse>) => {
      const message = event.data
      if (message.type === 'progress') {
        handlers.onProgress?.(message.payload)
        return
      }
      if (message.type === 'warning') {
        handlers.onWarning?.(message.payload)
        return
      }
      settled.resolve(message)
    }
    const onError = () => settled.resolve({ type: 'error', payload: 'The transcription worker stopped unexpectedly.' })
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)

    const request: TranscriptionRequest = {
      type: 'transcribe',
      samples: decoded.samples.buffer as ArrayBuffer,
      language,
    }
    worker.postMessage(request, [request.samples])
    const response = await settled.promise
    worker.removeEventListener('message', onMessage)
    worker.removeEventListener('error', onError)

    if (response.type === 'error') {
      throw new TranscriptionFailedError(response.payload)
    }
    if (response.type !== 'result') {
      throw new TranscriptionFailedError('The transcription worker returned an unexpected response.')
    }
    const trimmed = response.payload.text.trim()
    if (trimmed.length === 0) {
      return {
        status: 'rejected',
        reason: 'The model could not find speech in that recording. Write the note as text instead.',
      }
    }
    return { status: 'transcribed', text: trimmed, device: response.payload.device }
  }

  async dispose(): Promise<void> {
    const worker = this.worker
    if (!worker) return
    worker.postMessage({ type: 'dispose' })
    worker.terminate()
    this.worker = null
  }
}

export const transcriber = new LocalTranscriber()
