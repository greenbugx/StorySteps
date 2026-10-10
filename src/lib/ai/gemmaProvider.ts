import { Engine, loadLiteRtLm } from '@litert-lm/core'
import type { Conversation, Engine as LiteRtEngine, LiteRtLm } from '@litert-lm/core'
import { GEMMA_MODEL, LITERT_WASM_PATH } from '@/lib/ai/modelConfig'
import { openCachedModelStream } from '@/lib/ai/modelStore'
import type { GenerateOptions, LocalTextModel, ProviderStatus } from '@/lib/ai/provider'

export class LocalInferenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LocalInferenceError'
  }
}

let wasmLoad: Promise<LiteRtLm> | null = null
let engine: LiteRtEngine | null = null
let conversation: Conversation | null = null
let engineLoad: Promise<void> | null = null

async function ensureRuntime(): Promise<void> {
  if (wasmLoad) {
    await wasmLoad
    return
  }
  wasmLoad = loadLiteRtLm(LITERT_WASM_PATH)
  try {
    await wasmLoad
  } catch (error) {
    wasmLoad = null
    throw new LocalInferenceError(
      `The local Gemma runtime could not start: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  }
}

async function createEngine(
  report: (status: ProviderStatus) => void,
  allowRemoteLoad: boolean,
): Promise<LiteRtEngine> {
  const cachedStream = await openCachedModelStream()
  if (cachedStream) {
    report({
      status: 'loading',
      detail: `Reading ${GEMMA_MODEL.label} from local storage. The first load takes a while.`,
    })
    return Engine.create({ model: cachedStream, mainExecutorSettings: { maxNumTokens: 4096 } })
  }
  if (!allowRemoteLoad) {
    throw new LocalInferenceError(
      'The model file is not stored on this device. Download it from Settings before using local AI.',
    )
  }
  if (!navigator.onLine) {
    throw new LocalInferenceError('The model is not downloaded and this device is offline.')
  }
  report({
    status: 'loading',
    detail: 'Loading the model straight from Hugging Face for this session only.',
  })
  return Engine.create({ model: GEMMA_MODEL.url, mainExecutorSettings: { maxNumTokens: 4096 } })
}

export const gemmaProvider: LocalTextModel = {
  id: GEMMA_MODEL.id,

  isLoaded() {
    return conversation !== null
  },

  async load(report, options) {
    if (conversation) return
    if (engineLoad) return engineLoad
    engineLoad = (async () => {
      await ensureRuntime()
      report({ status: 'loading', detail: 'Starting the local model runtime.' })
      engine = await createEngine(report, options.allowRemoteLoad)
      conversation = await engine.createConversation()
      report({ status: 'ready', detail: null })
    })()
    try {
      await engineLoad
    } catch (error) {
      engineLoad = null
      engine = null
      conversation = null
      throw error
    }
  },

  async generate(options: GenerateOptions) {
    const active = conversation
    if (!active) {
      throw new LocalInferenceError('The local model is not loaded yet.')
    }
    const cancel = () => active.cancel()
    options.signal?.addEventListener('abort', cancel, { once: true })
    try {
      const stream = active.sendMessageStreaming([
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ])
      let output = ''
      for await (const message of stream) {
        const parts = message.content ?? []
        for (const part of typeof parts === 'string' ? [{ type: 'text' as const, text: parts }] : parts) {
          if (part.type === 'text') {
            output += part.text
            options.onToken?.(part.text)
          }
        }
      }
      return output
    } catch (error) {
      throw new LocalInferenceError(
        `The model stopped while writing a response: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    } finally {
      options.signal?.removeEventListener('abort', cancel)
    }
  },

  async release() {
    conversation?.cancel()
    const activeEngine = engine
    conversation = null
    engine = null
    engineLoad = null
    if (activeEngine) {
      await activeEngine.delete()
    }
  },
}
