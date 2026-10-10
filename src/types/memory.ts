export const MEMORY_CATEGORIES = [
  'oral-history',
  'natural-feature',
  'local-tradition',
  'environmental-change',
  'observation',
  'built-heritage',
] as const

export const SOURCE_TYPES = ['firsthand', 'recollection', 'observation', 'supplied-reference'] as const

export const VERIFICATION_STATUSES = ['unverified', 'corroborated', 'disputed'] as const

export const DATE_PRECISIONS = ['day', 'month', 'year'] as const

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number]
export type SourceType = (typeof SOURCE_TYPES)[number]
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]
export type DatePrecision = (typeof DATE_PRECISIONS)[number]

export const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  'oral-history': 'Oral history',
  'natural-feature': 'Natural feature',
  'local-tradition': 'Local tradition',
  'environmental-change': 'Environmental change',
  observation: 'Observation',
  'built-heritage': 'Built heritage',
}

export const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  'oral-history': 'var(--chart-2)',
  'natural-feature': 'var(--chart-1)',
  'local-tradition': 'var(--chart-4)',
  'environmental-change': 'var(--chart-3)',
  observation: 'var(--chart-5)',
  'built-heritage': 'var(--color-foreground)',
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  firsthand: 'Firsthand account',
  recollection: 'Recollection',
  observation: 'Direct observation',
  'supplied-reference': 'Supplied reference',
}

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  corroborated: 'Corroborated',
  disputed: 'Disputed',
}

export type MemoryRecord = {
  id: string
  title: string
  summary: string
  category: MemoryCategory
  originalText: string
  transcript: string
  recordedAt: string
  eventDate: string | null
  eventDatePrecision: DatePrecision | null
  eventDateUncertain: boolean
  sourceType: SourceType
  verificationStatus: VerificationStatus
  latitude: number | null
  longitude: number | null
  locationPrecision: 'device' | 'manual-estimate' | null
  placeLabel: string | null
  audioId: string | null
  tags: string[]
  sourceReferences: string[]
  needsCorroboration: string[]
  fieldSessionId: string | null
  createdAt: string
  updatedAt: string
}

export type AudioAsset = {
  id: string
  memoryId: string
  blob: Blob
  mimeType: string
  durationMs: number
  createdAt: string
  fileSizeBytes: number
}

export type FieldSession = {
  id: string
  label: string
  startedAt: string
  endedAt: string | null
  startLatitude: number | null
  startLongitude: number | null
  endLatitude: number | null
  endLongitude: number | null
  notes: string
  memoryIds: string[]
}

export type AppSetting = {
  key: string
  value: unknown
  updatedAt: string
}

export type ModelStatus = {
  modelId: string
  modelVersion: string
  status: ModelRuntimeStatus
  downloadedBytes: number | null
  totalBytes: number | null
  lastVerifiedAt: string | null
  storageStrategy: 'cache-api' | 'none'
}

export const MODEL_STATUSES = [
  'unsupported',
  'not-downloaded',
  'downloading',
  'ready',
  'loading',
  'generating',
  'error',
  'storage-limited',
] as const

export type ModelRuntimeStatus = (typeof MODEL_STATUSES)[number]

export type MemoryDraft = Omit<
  MemoryRecord,
  'id' | 'createdAt' | 'updatedAt' | 'audioId' | 'fieldSessionId'
> & {
  audioId?: string | null
  fieldSessionId?: string | null
}
