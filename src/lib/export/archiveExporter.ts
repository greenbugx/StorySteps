import { db } from '@/lib/db/database'
import { ARCHIVE_FORMAT, ARCHIVE_VERSION, type Archive, type ExportedMemory } from '@/lib/export/archiveSchema'
import { base64ToBytes, bytesToBase64 } from '@/lib/export/base64'
import type { AudioAsset } from '@/types/memory'

export type ExportProgress = { phase: 'collecting' | 'encoding-audio' | 'writing-file'; completed: number; total: number }

export async function buildArchive(
  includeAudio: boolean,
  onProgress?: (progress: ExportProgress) => void,
): Promise<Archive> {
  const records = await db.memories.orderBy('recordedAt').reverse().toArray()
  const sessions = await db.fieldSessions.toArray()
  const audioById = new Map(
    includeAudio ? (await db.audioAssets.toArray()).map((asset) => [asset.id, asset]) : [],
  )
  const exported: ExportedMemory[] = []

  for (const [index, record] of records.entries()) {
    const asset = record.audioId ? audioById.get(record.audioId) : undefined
    onProgress?.({ phase: 'encoding-audio', completed: index, total: records.length })
    const bytes = asset ? new Uint8Array(await asset.blob.arrayBuffer()) : null
    exported.push({
      ...record,
      audio: asset && bytes
        ? {
            id: asset.id,
            mimeType: asset.mimeType,
            durationMs: asset.durationMs,
            fileSizeBytes: asset.fileSizeBytes,
            base64: bytesToBase64(bytes),
          }
        : null,
    })
  }

  onProgress?.({ phase: 'writing-file', completed: records.length, total: records.length })
  return {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    includesAudio: includeAudio,
    fieldSessions: sessions.map((session) => ({ ...session })),
    records: exported,
  }
}

export function archiveFilename(exportedAt: string): string {
  return `storysteps-archive-${exportedAt.slice(0, 19).replace(/[:T]/g, '-')}.json`
}

export function downloadArchive(archive: Archive): string {
  const filename = archiveFilename(archive.exportedAt)
  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
  return filename
}

export function audioFromPayload(payload: NonNullable<ExportedMemory['audio']>): AudioAsset {
  return {
    id: payload.id,
    memoryId: '',
    blob: new Blob([base64ToBytes(payload.base64) as BlobPart], { type: payload.mimeType }),
    mimeType: payload.mimeType,
    durationMs: payload.durationMs,
    createdAt: new Date().toISOString(),
    fileSizeBytes: payload.fileSizeBytes,
  }
}
