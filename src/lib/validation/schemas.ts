import { z } from 'zod'
import {
  DATE_PRECISIONS,
  MEMORY_CATEGORIES,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
} from '@/types/memory'

const partialDatePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/

export const memoryCategorySchema = z.enum(MEMORY_CATEGORIES)
export const sourceTypeSchema = z.enum(SOURCE_TYPES)
export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES)
export const datePrecisionSchema = z.enum(DATE_PRECISIONS)

const isoInstant = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Enter a valid date and time' })

const monthPattern = /^\d{4}-\d{2}$/

function partialDateIsReal(value: string): boolean {
  const year = Number(value.slice(0, 4))
  if (year < 1 || year > 9999) return false
  if (monthPattern.test(value)) {
    const month = Number(value.slice(5, 7))
    return month >= 1 && month <= 12
  }
  if (value.length === 10) {
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }
  return true
}

export const partialDateSchema = z
  .string()
  .regex(partialDatePattern, { message: 'Use YYYY, YYYY-MM or YYYY-MM-DD' })
  .refine(partialDateIsReal, { message: 'That date does not exist' })

export const latitudeSchema = z
  .number()
  .min(-90, { message: 'Latitude must be between -90 and 90' })
  .max(90, { message: 'Latitude must be between -90 and 90' })

export const longitudeSchema = z
  .number()
  .min(-180, { message: 'Longitude must be between -180 and 180' })
  .max(180, { message: 'Longitude must be between -180 and 180' })

const coordinatesRefinement = (
  value: { latitude: number | null; longitude: number | null },
  context: z.RefinementCtx,
) => {
  if ((value.latitude === null) !== (value.longitude === null)) {
    context.addIssue({
      code: 'custom',
      message: 'Provide both latitude and longitude, or leave both empty',
      path: [value.latitude === null ? 'longitude' : 'latitude'],
    })
  }
}

export const memoryRecordSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, { message: 'Give this memory a title' }).max(160, {
      message: 'Keep the title under 160 characters',
    }),
    summary: z.string().trim().max(600, { message: 'Keep the summary under 600 characters' }),
    category: memoryCategorySchema,
    originalText: z.string(),
    transcript: z.string(),
    recordedAt: isoInstant,
    eventDate: partialDateSchema.nullable(),
    eventDatePrecision: datePrecisionSchema.nullable(),
    eventDateUncertain: z.boolean(),
    sourceType: sourceTypeSchema,
    verificationStatus: verificationStatusSchema,
    latitude: latitudeSchema.nullable(),
    longitude: longitudeSchema.nullable(),
    locationPrecision: z.enum(['device', 'manual-estimate']).nullable(),
    placeLabel: z.string().trim().max(160).nullable(),
    audioId: z.string().nullable(),
    tags: z.array(z.string().trim().min(1).max(48)).max(24),
    sourceReferences: z.array(z.string().trim().min(1).max(400)).max(24),
    needsCorroboration: z.array(z.string().trim().min(1).max(300)).max(24),
    fieldSessionId: z.string().nullable(),
    createdAt: isoInstant,
    updatedAt: isoInstant,
  })
  .superRefine(coordinatesRefinement)
  .refine(
    (record) => {
      if (record.eventDate === null) return record.eventDatePrecision === null
      const expected = record.eventDate.length === 4 ? 'year' : record.eventDate.length === 7 ? 'month' : 'day'
      return record.eventDatePrecision === expected
    },
    {
      message: 'Date precision does not match the date',
      path: ['eventDatePrecision'],
    },
  )

export const audioAssetSchema = z.object({
  id: z.string().min(1),
  memoryId: z.string().min(1),
  blob: z.custom<Blob>((value) => value instanceof Blob, { message: 'Audio payload is missing' }),
  mimeType: z.string().min(1),
  durationMs: z.number().min(0),
  createdAt: isoInstant,
  fileSizeBytes: z.number().int().min(0),
})

export const fieldSessionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(120),
  startedAt: isoInstant,
  endedAt: isoInstant.nullable(),
  startLatitude: latitudeSchema.nullable(),
  startLongitude: longitudeSchema.nullable(),
  endLatitude: latitudeSchema.nullable(),
  endLongitude: longitudeSchema.nullable(),
  notes: z.string(),
  memoryIds: z.array(z.string()),
})

export const appSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  updatedAt: isoInstant,
})

export type MemoryRecordInput = z.infer<typeof memoryRecordSchema>
export type FieldSessionInput = z.infer<typeof fieldSessionSchema>
