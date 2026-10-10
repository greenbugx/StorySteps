export type BrowserCapabilities = {
  secureContext: boolean
  indexedDb: boolean
  cacheStorage: boolean
  serviceWorker: boolean
  webGpu: 'unknown' | 'available' | 'unavailable'
  webGpuReason: string | null
  storageEstimate: { usage: number | null; quota: number | null }
  persistentStorage: 'unknown' | 'granted' | 'denied' | 'unsupported'
  micSupported: boolean
  geolocationSupported: boolean
  online: boolean
}

export async function requestWebGpuAdapter(): Promise<{ available: boolean; reason: string | null }> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu
  if (!gpu) {
    return { available: false, reason: 'This browser does not expose the WebGPU API.' }
  }
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' })
    if (!adapter) {
      return { available: false, reason: 'No WebGPU adapter is available on this device.' }
    }
    return { available: true, reason: null }
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : 'WebGPU adapter request failed.' }
  }
}

export async function readStorageEstimate(): Promise<{ usage: number | null; quota: number | null }> {
  if (!navigator.storage?.estimate) return { usage: null, quota: null }
  try {
    const estimate = await navigator.storage.estimate()
    return { usage: estimate.usage ?? null, quota: estimate.quota ?? null }
  } catch {
    return { usage: null, quota: null }
  }
}

export async function readPersistentStorage(): Promise<BrowserCapabilities['persistentStorage']> {
  if (!navigator.storage?.persist) return 'unsupported'
  try {
    if (await navigator.storage.persisted()) return 'granted'
    return 'denied'
  } catch {
    return 'unknown'
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function detectBrowserCapabilities(): Promise<BrowserCapabilities> {
  const webGpu = await requestWebGpuAdapter()
  const [storageEstimate, persistentStorage] = await Promise.all([
    readStorageEstimate(),
    readPersistentStorage(),
  ])
  return {
    secureContext: window.isSecureContext,
    indexedDb: typeof indexedDB !== 'undefined',
    cacheStorage: typeof caches !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    webGpu: webGpu.available ? 'available' : 'unavailable',
    webGpuReason: webGpu.reason,
    storageEstimate,
    persistentStorage,
    micSupported: typeof navigator.mediaDevices?.getUserMedia === 'function',
    geolocationSupported: typeof navigator.geolocation?.getCurrentPosition === 'function',
    online: navigator.onLine,
  }
}
