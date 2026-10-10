export type TranscriptionRequest = {
  type: 'transcribe'
  samples: ArrayBuffer
  language: string | null
}

export type TranscriptionDisposeRequest = {
  type: 'dispose'
}

export type TranscribeMessage = TranscriptionRequest | TranscriptionDisposeRequest

export type ModelLoadProgress = {
  phase: 'model'
  file?: string
  progress?: number
  loaded?: number
  total?: number
}

export type WorkerProgress = ModelLoadProgress | { phase: 'transcribe'; progress: number }

export type TranscriptionProgressMessage = {
  type: 'progress'
  payload: WorkerProgress
}

export type TranscriptionResult = {
  type: 'result'
  payload: { text: string; device: 'webgpu' | 'wasm' | null }
}

export type TranscriptionFailure = {
  type: 'error'
  payload: string
}

export type TranscriptionWarning = {
  type: 'warning'
  payload: string
}

export type TranscriptionResponse =
  | TranscriptionProgressMessage
  | TranscriptionResult
  | TranscriptionFailure
  | TranscriptionWarning
