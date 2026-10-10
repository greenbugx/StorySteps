import type { ModelRuntimeStatus } from '@/types/memory'

export type ProviderStatus = {
  status: ModelRuntimeStatus
  detail: string | null
}

export type LoadOptions = {
  allowRemoteLoad: boolean
}

export type GenerateOptions = {
  systemPrompt: string
  userPrompt: string
  onToken?: (chunk: string) => void
  signal?: AbortSignal
}

export interface LocalTextModel {
  readonly id: string
  load(report: (status: ProviderStatus) => void, options: LoadOptions): Promise<void>
  generate(options: GenerateOptions): Promise<string>
  release(): Promise<void>
  isLoaded(): boolean
}
