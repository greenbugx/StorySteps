import { memoryRecordSchema } from '@/lib/validation/schemas'
import type { MemoryDraft, MemoryRecord } from '@/types/memory'

export type MemoryEditorValue = {
  title: string
  summary: string
  category: MemoryRecord['category']
  sourceType: MemoryRecord['sourceType']
  verificationStatus: MemoryRecord['verificationStatus']
  recordedAt: string
  eventDate: string
  placeLabel: string
  latitude: string
  longitude: string
  tags: string
  sourceReferences: string
  originalText: string
  transcript: string
}

export function emptyMemoryEditorValue(): MemoryEditorValue {
  return {
    title: '',
    summary: '',
    category: 'observation',
    sourceType: 'observation',
    verificationStatus: 'unverified',
    recordedAt: new Date().toISOString(),
    eventDate: '',
    placeLabel: '',
    latitude: '',
    longitude: '',
    tags: '',
    sourceReferences: '',
    originalText: '',
    transcript: '',
  }
}

export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function fromLocalInputValue(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function editorValueFromRecord(record: MemoryRecord): MemoryEditorValue {
  return {
    title: record.title,
    summary: record.summary,
    category: record.category,
    sourceType: record.sourceType,
    verificationStatus: record.verificationStatus,
    recordedAt: toLocalInputValue(record.recordedAt),
    eventDate: record.eventDate ?? '',
    placeLabel: record.placeLabel ?? '',
    latitude: record.latitude === null ? '' : String(record.latitude),
    longitude: record.longitude === null ? '' : String(record.longitude),
    tags: record.tags.join('\n'),
    sourceReferences: record.sourceReferences.join('\n'),
    originalText: record.originalText,
    transcript: record.transcript,
  }
}

export function editorValueToDraft(value: MemoryEditorValue): MemoryDraft {
  const eventDate = value.eventDate.trim()
  const latitude = value.latitude.trim() === '' ? null : Number(value.latitude)
  const longitude = value.longitude.trim() === '' ? null : Number(value.longitude)
  return {
    title: value.title.trim(),
    summary: value.summary.trim(),
    category: value.category,
    sourceType: value.sourceType,
    verificationStatus: value.verificationStatus,
    originalText: value.originalText,
    transcript: value.transcript,
    recordedAt: fromLocalInputValue(value.recordedAt),
    eventDate: eventDate === '' ? null : eventDate,
    eventDatePrecision:
      eventDate === '' ? null : eventDate.length === 4 ? 'year' : eventDate.length === 7 ? 'month' : 'day',
    eventDateUncertain: false,
    latitude: latitude !== null && Number.isFinite(latitude) ? latitude : null,
    longitude: longitude !== null && Number.isFinite(longitude) ? longitude : null,
    locationPrecision: latitude !== null && Number.isFinite(latitude) ? 'manual-estimate' : null,
    placeLabel: value.placeLabel.trim() === '' ? null : value.placeLabel.trim(),
    tags: splitLines(value.tags),
    sourceReferences: splitLines(value.sourceReferences),
    needsCorroboration: [],
    audioId: null,
    fieldSessionId: null,
  }
}

export function validateEditorValue(value: MemoryEditorValue): Record<string, string> {
  const draft = editorValueToDraft(value)
  const now = new Date().toISOString()
  const candidate = {
    ...draft,
    id: 'mem_validation',
    createdAt: now,
    updatedAt: now,
    audioId: null,
    fieldSessionId: null,
  }
  const parsed = memoryRecordSchema.safeParse(candidate)
  const errors: Record<string, string> = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      if (!errors[key]) errors[key] = issue.message
    }
  }
  return errors
}
