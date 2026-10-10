import { describe, expect, it } from 'vitest'
import { db } from '@/lib/db/database'
import { startFieldSession } from '@/lib/db/fieldSessionRepository'
import {
  applyMemoryQuery,
  createMemory,
  deleteMemory,
  emptyMemoryQuery,
  getMemory,
  listMemories,
  orphanAudioAssets,
  purgeOrphanAudioAssets,
  saveAudioAsset,
  updateMemory,
} from '@/lib/db/memoryRepository'
import type { MemoryDraft, MemoryRecord } from '@/types/memory'

function draft(overrides: Partial<MemoryDraft> = {}): MemoryDraft {
  return {
    title: 'The banyan at the old crossing',
    summary: 'People tied ribbons to it before the bridge was built.',
    category: 'local-tradition',
    originalText: 'My uncle said the ribbons were for safe crossings.',
    transcript: '',
    recordedAt: '2024-05-04T09:15:00.000Z',
    eventDate: null,
    eventDatePrecision: null,
    eventDateUncertain: false,
    sourceType: 'firsthand',
    verificationStatus: 'unverified',
    latitude: null,
    longitude: null,
    locationPrecision: null,
    placeLabel: null,
    tags: ['crossing'],
    sourceReferences: [],
    needsCorroboration: [],
    ...overrides,
  }
}

describe('memory repository', () => {
  it('persists a typed memory and reads it back', async () => {
    const created = await createMemory(draft())
    expect(created.id).toMatch(/^mem_/)
    const stored = await getMemory(created.id)
    expect(stored?.title).toBe('The banyan at the old crossing')
    expect(stored?.originalText).toContain('ribbons')
  })

  it('keeps memories without coordinates', async () => {
    const created = await createMemory(draft())
    const records = await listMemories(emptyMemoryQuery)
    expect(records.some((record) => record.id === created.id && record.latitude === null)).toBe(true)
  })

  it('rejects an invalid record before it reaches the database', async () => {
    await expect(createMemory(draft({ latitude: 120, longitude: 10 }))).rejects.toThrow()
    expect(await db.memories.count()).toBe(0)
  })

  it('updates a record and stamps updatedAt', async () => {
    const created = await createMemory(draft())
    const updated = await updateMemory(created.id, { verificationStatus: 'corroborated', title: 'Renamed banyan' })
    expect(updated.title).toBe('Renamed banyan')
    expect(updated.verificationStatus).toBe('corroborated')
    expect(updated.createdAt).toBe(created.createdAt)
  })

  it('links a memory to a field session both ways', async () => {
    const session = await startFieldSession('Evening walk')
    const created = await createMemory(draft({ fieldSessionId: session.id }))
    const storedSession = await db.fieldSessions.get(session.id)
    expect(storedSession?.memoryIds).toContain(created.id)
  })

  it('removes the linked recording when a memory is deleted', async () => {
    const created = await createMemory(draft())
    const asset = await saveAudioAsset({
      memoryId: created.id,
      blob: new Blob(['audio'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 1200,
      fileSizeBytes: 5,
    })
    await updateMemory(created.id, { audioId: asset.id })

    await deleteMemory(created.id, false)

    expect(await db.memories.get(created.id)).toBeUndefined()
    expect(await db.audioAssets.get(asset.id)).toBeUndefined()
  })

  it('keeps the recording when the user asks to retain it and cleans it up later', async () => {
    const created = await createMemory(draft())
    const asset = await saveAudioAsset({
      memoryId: created.id,
      blob: new Blob(['audio'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 1200,
      fileSizeBytes: 5,
    })
    await updateMemory(created.id, { audioId: asset.id })

    await deleteMemory(created.id, true)
    expect(await db.audioAssets.get(asset.id)).toBeDefined()
    expect((await orphanAudioAssets()).map((orphan) => orphan.id)).toEqual([asset.id])

    expect(await purgeOrphanAudioAssets()).toBe(1)
    expect(await db.audioAssets.get(asset.id)).toBeUndefined()
  })
})

describe('applyMemoryQuery', () => {
  const records: MemoryRecord[] = [
    { ...draft(), id: 'a', title: 'Banyan at the crossing', tags: ['crossing'], recordedAt: '2024-01-01T00:00:00.000Z', latitude: 26.1, longitude: 91.7, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', audioId: null, fieldSessionId: null },
    {
      ...draft(),
      id: 'b',
      title: 'Dry well at the orchard',
      category: 'environmental-change' as const,
      tags: [],
      originalText: 'The well has been dry since the channel moved.',
      recordedAt: '2024-06-01T00:00:00.000Z',
      createdAt: '2024-06-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
      audioId: null,
      fieldSessionId: null,
    },
  ]

  it('sorts newest first', () => {
    expect(applyMemoryQuery(records, emptyMemoryQuery).map((record) => record.id)).toEqual(['b', 'a'])
  })

  it('searches titles, notes and tags case insensitively', () => {
    expect(applyMemoryQuery(records, { ...emptyMemoryQuery, text: 'banyan' }).map((record) => record.id)).toEqual(['a'])
    expect(applyMemoryQuery(records, { ...emptyMemoryQuery, text: 'UNCLE' }).map((record) => record.id)).toEqual(['a'])
    expect(applyMemoryQuery(records, { ...emptyMemoryQuery, text: 'crossing' }).map((record) => record.id)).toEqual(['a'])
    expect(applyMemoryQuery(records, { ...emptyMemoryQuery, text: 'orchard' }).map((record) => record.id)).toEqual(['b'])
  })

  it('filters by category and by coordinate presence', () => {
    expect(
      applyMemoryQuery(records, { ...emptyMemoryQuery, categories: ['environmental-change'] }).map((record) => record.id),
    ).toEqual(['b'])
    expect(applyMemoryQuery(records, { ...emptyMemoryQuery, coordinates: 'absent' }).map((record) => record.id)).toEqual(['b'])
  })
})
