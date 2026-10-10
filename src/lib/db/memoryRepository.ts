import { db } from '@/lib/db/database'
import { createId } from '@/lib/ids'
import { memoryRecordSchema } from '@/lib/validation/schemas'
import type { AudioAsset, MemoryDraft, MemoryRecord } from '@/types/memory'

export type MemoryQuery = {
  text: string
  categories: MemoryRecord['category'][]
  sourceTypes: MemoryRecord['sourceType'][]
  verificationStatuses: MemoryRecord['verificationStatus'][]
  coordinates: 'any' | 'present' | 'absent'
  placeLabel: string | null
  fieldSessionId: string | null
}

export const emptyMemoryQuery: MemoryQuery = {
  text: '',
  categories: [],
  sourceTypes: [],
  verificationStatuses: [],
  coordinates: 'any',
  placeLabel: null,
  fieldSessionId: null,
}

function matchesText(record: MemoryRecord, needle: string): boolean {
  if (needle.length === 0) return true
  const haystack = [
    record.title,
    record.summary,
    record.placeLabel ?? '',
    record.originalText,
    record.transcript,
    ...record.tags,
    ...record.sourceReferences,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export function applyMemoryQuery(records: MemoryRecord[], query: MemoryQuery): MemoryRecord[] {
  const needle = query.text.trim().toLowerCase()
  return records
    .filter((record) => {
      if (query.categories.length > 0 && !query.categories.includes(record.category)) return false
      if (query.sourceTypes.length > 0 && !query.sourceTypes.includes(record.sourceType)) return false
      if (
        query.verificationStatuses.length > 0 &&
        !query.verificationStatuses.includes(record.verificationStatus)
      ) {
        return false
      }
      if (query.coordinates === 'present' && record.latitude === null) return false
      if (query.coordinates === 'absent' && record.latitude !== null) return false
      if (query.placeLabel !== null && record.placeLabel !== query.placeLabel) return false
      if (query.fieldSessionId !== null && record.fieldSessionId !== query.fieldSessionId) return false
      return matchesText(record, needle)
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
}

export async function listMemories(query: MemoryQuery = emptyMemoryQuery): Promise<MemoryRecord[]> {
  const records = await db.memories.toArray()
  return applyMemoryQuery(records, query)
}

export async function getMemory(id: string): Promise<MemoryRecord | undefined> {
  return db.memories.get(id)
}

export async function createMemory(draft: MemoryDraft): Promise<MemoryRecord> {
  const now = new Date().toISOString()
  const candidate: MemoryRecord = {
    ...draft,
    id: createId('mem'),
    audioId: draft.audioId ?? null,
    fieldSessionId: draft.fieldSessionId ?? null,
    createdAt: now,
    updatedAt: now,
  }
  const record = memoryRecordSchema.parse(candidate)
  await db.memories.add(record)
  if (record.fieldSessionId) {
    const session = await db.fieldSessions.get(record.fieldSessionId)
    if (session && !session.memoryIds.includes(record.id)) {
      await db.fieldSessions.update(record.fieldSessionId, {
        memoryIds: [...session.memoryIds, record.id],
      })
    }
  }
  return record
}

export async function updateMemory(id: string, changes: Partial<MemoryDraft>): Promise<MemoryRecord> {
  const existing = await db.memories.get(id)
  if (!existing) throw new Error('That memory no longer exists')
  const candidate = { ...existing, ...changes, id: existing.id, updatedAt: new Date().toISOString() }
  const record = memoryRecordSchema.parse(candidate)
  await db.memories.put(record)
  if (record.fieldSessionId) {
    const session = await db.fieldSessions.get(record.fieldSessionId)
    if (session && !session.memoryIds.includes(record.id)) {
      await db.fieldSessions.update(record.fieldSessionId, {
        memoryIds: [...session.memoryIds, record.id],
      })
    }
  }
  return record
}

export async function deleteMemory(id: string, retainAudio: boolean): Promise<void> {
  const record = await db.memories.get(id)
  if (!record) return
  await db.transaction('rw', db.memories, db.audioAssets, db.fieldSessions, async () => {
    await db.memories.delete(id)
    if (record.audioId && !retainAudio) {
      await db.audioAssets.delete(record.audioId)
    }
    const session = record.fieldSessionId ? await db.fieldSessions.get(record.fieldSessionId) : undefined
    if (session) {
      await db.fieldSessions.update(session.id, {
        memoryIds: session.memoryIds.filter((memoryId) => memoryId !== id),
      })
    }
  })
}

export async function saveAudioAsset(asset: Omit<AudioAsset, 'id' | 'createdAt'>): Promise<AudioAsset> {
  const record: AudioAsset = {
    ...asset,
    id: createId('aud'),
    createdAt: new Date().toISOString(),
  }
  await db.audioAssets.add(record)
  return record
}

export async function getAudioAsset(id: string): Promise<AudioAsset | undefined> {
  return db.audioAssets.get(id)
}

export async function deleteAudioAsset(id: string): Promise<void> {
  await db.audioAssets.delete(id)
}

export async function deleteAllRecords(): Promise<void> {
  await db.transaction('rw', db.memories, db.audioAssets, db.fieldSessions, async () => {
    await db.memories.clear()
    await db.audioAssets.clear()
    await db.fieldSessions.clear()
  })
}

export async function orphanAudioAssets(): Promise<AudioAsset[]> {
  const [assets, memories] = await Promise.all([db.audioAssets.toArray(), db.memories.toArray()])
  const referenced = new Set(memories.map((memory) => memory.audioId))
  return assets.filter((asset) => !referenced.has(asset.id))
}

export async function purgeOrphanAudioAssets(): Promise<number> {
  const orphans = await orphanAudioAssets()
  await db.transaction('rw', db.audioAssets, db.memories, async () => {
    for (const asset of orphans) {
      await db.audioAssets.delete(asset.id)
    }
  })
  return orphans.length
}
