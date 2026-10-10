import { z } from 'zod'
import { memoryRecordSchema } from '@/lib/validation/schemas'

export const ARCHIVE_FORMAT = 'storysteps-archive'
export const ARCHIVE_VERSION = 1

export const audioPayloadSchema = z.object({
  id: z.string().min(1),
  mimeType: z.string().min(1),
  durationMs: z.number().min(0),
  fileSizeBytes: z.number().int().min(0),
  base64: z.string(),
})

export const exportedMemorySchema = memoryRecordSchema.extend({
  audio: audioPayloadSchema.nullable(),
})

export const archiveSchema = z.object({
  format: z.literal(ARCHIVE_FORMAT),
  version: z.literal(ARCHIVE_VERSION),
  exportedAt: z.string().min(1),
  includesAudio: z.boolean(),
  fieldSessions: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string(),
      startedAt: z.string(),
      endedAt: z.string().nullable(),
      startLatitude: z.number().nullable(),
      startLongitude: z.number().nullable(),
      endLatitude: z.number().nullable(),
      endLongitude: z.number().nullable(),
      notes: z.string(),
      memoryIds: z.array(z.string()),
    }),
  ),
  records: z.array(exportedMemorySchema).min(1, { message: 'The archive contains no records' }),
})

export type ExportedMemory = z.infer<typeof exportedMemorySchema>
export type Archive = z.infer<typeof archiveSchema>
