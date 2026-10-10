export type ModelDescriptor = {
  id: string
  label: string
  repo: string
  fileName: string
  url: string
  approxBytes: number
  license: string
  licenseUrl: string
  purpose: string
}

export const GEMMA_MODEL: ModelDescriptor = {
  id: 'gemma-4-e2b-it-web',
  label: 'Gemma 4 E2B (WebGPU build)',
  repo: 'litert-community/gemma-4-E2B-it-litert-lm',
  fileName: 'gemma-4-E2B-it-web.litertlm',
  url: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm',
  approxBytes: 2_008_432_640,
  license: 'Apache-2.0 (Gemma terms apply)',
  licenseUrl: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm',
  purpose: 'Structures a note or transcript into an archive record',
}

export const WHISPER_MODEL = {
  id: 'onnx-community/whisper-base',
  label: 'Whisper base (ONNX, quantised)',
  approxBytes: 76_000_000,
  license: 'Apache-2.0',
  licenseUrl: 'https://huggingface.co/onnx-community/whisper-base',
  purpose: 'Transcribes recorded audio on this device',
} as const

export const LITERT_WASM_PATH = '/runtime/litert'
export const ORT_WASM_PATHS = {
  webgpu: {
    mjs: '/runtime/ort/ort-wasm-simd-threaded.asyncify.mjs',
    wasm: '/runtime/ort/ort-wasm-simd-threaded.asyncify.wasm',
  },
  wasm: {
    mjs: '/runtime/ort/ort-wasm-simd-threaded.asyncify.mjs',
    wasm: '/runtime/ort/ort-wasm-simd-threaded.asyncify.wasm',
  },
} as const

export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return 'unknown size'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}
