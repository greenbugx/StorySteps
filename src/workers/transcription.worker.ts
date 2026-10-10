import { env, pipeline } from '@huggingface/transformers'
import type { AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import { ORT_WASM_PATHS, WHISPER_MODEL } from '@/lib/ai/modelConfig'
import type { TranscribeMessage, TranscriptionResponse } from '@/lib/ai/transcriptionProtocol'

env.allowLocalModels = false
env.useBrowserCache = true

let transcriber: AutomaticSpeechRecognitionPipeline | null = null
let device: 'webgpu' | 'wasm' | null = null

async function resolveDevice(): Promise<'webgpu' | 'wasm'> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu
  if (!gpu) return 'wasm'
  try {
    const adapter = await gpu.requestAdapter()
    return adapter ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

async function loadPipeline(target: 'webgpu' | 'wasm'): Promise<AutomaticSpeechRecognitionPipeline> {
  const onnx = env.backends.onnx
  if (onnx?.wasm) {
    onnx.wasm.wasmPaths = ORT_WASM_PATHS[target]
  }
  return pipeline('automatic-speech-recognition', WHISPER_MODEL.id, {
    device: target,
    dtype: target === 'webgpu' ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
    progress_callback: (item: unknown) => {
      const progress = item as {
        status?: string
        file?: string
        progress?: number
        loaded?: number
        total?: number
      }
      if (progress.status !== 'progress' && progress.status !== 'done') return
      const payload =
        progress.status === 'progress'
          ? { phase: 'model' as const, file: progress.file, progress: progress.progress }
          : { phase: 'model' as const, file: progress.file, loaded: progress.loaded, total: progress.total }
      self.postMessage({ type: 'progress', payload } satisfies TranscriptionResponse)
    },
  })
}

async function ensureTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (transcriber) return transcriber
  const preferred = await resolveDevice()
  try {
    transcriber = await loadPipeline(preferred)
    device = preferred
    return transcriber
  } catch (error) {
    if (preferred === 'wasm') throw error
    self.postMessage({
      type: 'warning',
      payload: `WebGPU could not start the transcription model here, so it is running on the processor instead. ${
        error instanceof Error ? error.message : ''
      }`,
    } satisfies TranscriptionResponse)
    transcriber = await loadPipeline('wasm')
    device = 'wasm'
    return transcriber
  }
}

self.addEventListener('message', async (event: MessageEvent<TranscribeMessage>) => {
  const request = event.data
  if (request.type === 'dispose') {
    await transcriber?.dispose()
    transcriber = null
    device = null
    return
  }

  try {
    const model = await ensureTranscriber()
    self.postMessage({ type: 'progress', payload: { phase: 'transcribe', progress: 0 } } satisfies TranscriptionResponse)
    const audio = new Float32Array(request.samples)
    const output = await model(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
      language: request.language ?? undefined,
      task: 'transcribe',
    })
    const text = Array.isArray(output) ? (output[0]?.text ?? '') : (output.text ?? '')
    self.postMessage({ type: 'result', payload: { text, device } } satisfies TranscriptionResponse)
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : 'Transcription failed for an unknown reason.',
    } satisfies TranscriptionResponse)
  }
})
