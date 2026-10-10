import { db } from '@/lib/db/database'
import { audioFromPayload } from '@/lib/export/archiveExporter'
import { createId } from '@/lib/ids'
import { archiveSchema, type Archive } from '@/lib/export/archiveSchema'
import type { FieldSession, MemoryRecord } from '@/types/memory'

export type DuplicatePolicy = 'skip' | 'replace'

export type ImportPreview = {
  archive: Archive
  newRecords: number
  existingRecords: number
  audioCount: number
  totalBytes: number
}

export class ImportValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super('This file is not a valid StorySteps archive')
    this.name = 'ImportValidationError'
    this.issues = issues
  }
}

export async function previewImport(raw: unknown, policy: DuplicatePolicy): Promise<ImportPreview> {
  const parsed = archiveSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 8).map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'archive'
      return `${path}: ${issue.message}`
    })
    throw new ImportValidationError(issues)
  }

  const archive = parsed.data
  const existing = new Set((await db.memories.toCollection().primaryKeys()).map(String))
  let newRecords = 0
  let existingRecords = 0
  let audioCount = 0
  let totalBytes = 0

  for (const record of archive.records) {
    if (existing.has(record.id)) {
      existingRecords += 1
      if (policy === 'skip') continue
    } else {
      newRecords += 1
    }
    if (record.audio) {
      audioCount += 1
      totalBytes += record.audio.fileSizeBytes
    }
  }

  return { archive, newRecords, existingRecords, audioCount, totalBytes }
}

export async function importArchive(preview: ImportPreview, policy: DuplicatePolicy): Promise<number> {
  const { archive } = preview
  const written = await db.transaction('rw', db.memories, db.audioAssets, db.fieldSessions, async () => {
    let count = 0
    for (const exported of archive.records) {
      const existing = await db.memories.get(exported.id)
      if (existing && policy === 'skip') continue
      const { audio, ...memory } = exported
      const audioAsset = audio ? { ...audioFromPayload(audio), id: createId('aud'), memoryId: exported.id } : null
      const record: MemoryRecord = { ...memory, audioId: audioAsset ? audioAsset.id : memory.audioId }
      await db.memories.put(record)
      if (audioAsset) {
        await db.audioAssets.put(audioAsset)
      }
      count += 1
    }
    for (const session of archive.fieldSessions) {
      await db.fieldSessions.put(session as FieldSession)
    }
    return count
  })
  return written
}
