import { describe, expect, it } from 'vitest'
import { db } from '@/lib/db/database'
import { createMemory, saveAudioAsset, updateMemory } from '@/lib/db/memoryRepository'
import { buildArchive } from '@/lib/export/archiveExporter'
import { ImportValidationError, importArchive, previewImport } from '@/lib/export/archiveImporter'
import type { MemoryDraft } from '@/types/memory'

function draft(overrides: Partial<MemoryDraft> = {}): MemoryDraft {
  return {
    title: 'The ferry slip at Titashpur',
    summary: 'The landing was rebuilt in concrete in the 1970s.',
    category: 'built-heritage',
    originalText: 'The stones under the water are older than the slipway.',
    transcript: '',
    recordedAt: '2024-03-02T10:00:00.000Z',
    eventDate: '1970',
    eventDatePrecision: 'year',
    eventDateUncertain: true,
    sourceType: 'recollection',
    verificationStatus: 'unverified',
    latitude: 26.1445,
    longitude: 91.7362,
    locationPrecision: 'manual-estimate',
    placeLabel: 'Titashpur ghat',
    tags: ['river'],
    sourceReferences: ['Talukdar, "River Life", 1994'],
    needsCorroboration: [],
    ...overrides,
  }
}

describe('archive export and import', () => {
  it('round trips records with and without audio', async () => {
    const created = await createMemory(draft())
    const asset = await saveAudioAsset({
      memoryId: created.id,
      blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 900,
      fileSizeBytes: 4,
    })
    await updateMemory(created.id, { audioId: asset.id })

    const archive = await buildArchive(true)
    expect(archive.format).toBe('storysteps-archive')
    expect(archive.version).toBe(1)
    expect(archive.records).toHaveLength(1)
    expect(archive.records[0].audio?.base64).toBeTruthy()

    const preview = await previewImport(JSON.parse(JSON.stringify(archive)), 'replace')
    expect(preview.newRecords).toBe(0)
    expect(preview.existingRecords).toBe(1)

    const written = await importArchive(preview, 'replace')
    expect(written).toBe(1)

    const restored = await db.memories.get(created.id)
    expect(restored?.title).toBe('The ferry slip at Titashpur')
    expect(restored?.eventDate).toBe('1970')

    const restoredAudio = restored?.audioId ? await db.audioAssets.get(restored.audioId) : undefined
    expect(restoredAudio?.fileSizeBytes).toBe(4)
  })

  it('rejects a malformed archive without writing anything', async () => {
    const created = await createMemory(draft())
    const broken = {
      format: 'storysteps-archive',
      version: 1,
      exportedAt: '2024-03-02T10:00:00.000Z',
      includesAudio: false,
      fieldSessions: [],
      records: [{ id: 'mem_x', title: 'Missing most fields' }],
    }

    await expect(previewImport(broken, 'skip')).rejects.toBeInstanceOf(ImportValidationError)
    expect(await db.memories.count()).toBe(1)
    expect((await db.memories.get(created.id))?.title).toBe('The ferry slip at Titashpur')
  })

  it('rejects an archive with out of range coordinates', async () => {
    await createMemory(draft())
    const archive = await buildArchive(false)
    const tampered = JSON.parse(JSON.stringify(archive)) as typeof archive & {
      records: { latitude: number; longitude: number }[]
    }
    tampered.records[0].latitude = 999
    await expect(previewImport(tampered, 'replace')).rejects.toBeInstanceOf(ImportValidationError)
    expect(await db.memories.count()).toBe(1)
  })

  it('skips records that already exist when asked to keep them', async () => {
    const created = await createMemory(draft())
    const archive = await buildArchive(false)
    const preview = await previewImport(JSON.parse(JSON.stringify(archive)), 'skip')
    expect(preview.newRecords).toBe(0)
    expect(await importArchive(preview, 'skip')).toBe(0)
    expect((await db.memories.get(created.id))?.title).toBe('The ferry slip at Titashpur')
  })
})
