import { GEMMA_MODEL } from '@/lib/ai/modelConfig'

const MODEL_CACHE_NAME = 'storysteps-models-v1'

export type ModelStoreProgress = { receivedBytes: number; totalBytes: number | null }

function modelCacheKey(): Request {
  return new Request(GEMMA_MODEL.url)
}

async function openModelCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  try {
    return await caches.open(MODEL_CACHE_NAME)
  } catch {
    return null
  }
}

export async function isModelCached(): Promise<boolean> {
  const cache = await openModelCache()
  if (!cache) return false
  return (await cache.match(modelCacheKey())) !== undefined
}

export async function cachedModelBytes(): Promise<number | null> {
  const cache = await openModelCache()
  if (!cache) return null
  const response = await cache.match(modelCacheKey())
  if (!response) return null
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > 0) return declared
  const buffer = await response.clone().arrayBuffer()
  return buffer.byteLength
}

export async function removeCachedModel(): Promise<void> {
  const cache = await openModelCache()
  if (!cache) return
  await cache.delete(modelCacheKey())
}

export async function modelStorageSupported(): Promise<boolean> {
  return (await openModelCache()) !== null
}

async function probeRemoteSize(): Promise<number | null> {
  try {
    const response = await fetch(GEMMA_MODEL.url, { method: 'HEAD', redirect: 'follow' })
    const declared = Number(response.headers.get('content-length'))
    return Number.isFinite(declared) && declared > 0 ? declared : null
  } catch {
    return null
  }
}

export class ModelDownloadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelDownloadError'
  }
}

export async function downloadModel(
  onProgress: (progress: ModelStoreProgress) => void,
  signal: AbortSignal,
): Promise<void> {
  const cache = await openModelCache()
  if (!cache) {
    throw new ModelDownloadError(
      'This browser cannot store model files locally, so the model cannot be kept for offline use.',
    )
  }
  const totalBytes = (await probeRemoteSize()) ?? GEMMA_MODEL.approxBytes
  const response = await fetch(GEMMA_MODEL.url, { signal, redirect: 'follow' })
  if (!response.ok || !response.body) {
    throw new ModelDownloadError(`The model download failed with status ${response.status}.`)
  }

  let receivedBytes = 0
  const tracker = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      receivedBytes += chunk.byteLength
      onProgress({ receivedBytes, totalBytes })
      controller.enqueue(chunk)
    },
  })

  try {
    await cache.put(modelCacheKey(), new Response(response.body.pipeThrough(tracker), {
      headers: { 'content-type': 'application/octet-stream', 'content-length': String(totalBytes) },
    }))
  } catch (error) {
    await cache.delete(modelCacheKey())
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new ModelDownloadError('The browser ran out of storage while saving the model file.')
    }
    throw new ModelDownloadError(
      error instanceof Error ? error.message : 'The model file could not be written to local storage.',
    )
  }
}

export async function openCachedModelStream(): Promise<ReadableStream<Uint8Array> | null> {
  const cache = await openModelCache()
  if (!cache) return null
  const response = await cache.match(modelCacheKey())
  if (!response?.body) return null
  return response.body
}
