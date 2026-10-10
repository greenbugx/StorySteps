import { z } from 'zod'
import { memoryCategorySchema, sourceTypeSchema } from '@/lib/validation/schemas'

export const extractionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(600),
  category: memoryCategorySchema,
  sourceType: sourceTypeSchema,
  eventDate: z.string().trim().nullable(),
  eventDateUncertain: z.boolean(),
  placeLabel: z.string().trim().max(160).nullable(),
  tags: z.array(z.string().trim().min(1).max(48)).max(8),
  needsCorroboration: z.array(z.string().trim().min(1).max(300)).max(6),
})

export type ExtractionResult = z.infer<typeof extractionSchema>

export class ExtractionParseError extends Error {
  readonly raw: string

  constructor(message: string, raw: string) {
    super(message)
    this.name = 'ExtractionParseError'
    this.raw = raw
  }
}

export const EXTRACTION_SYSTEM_PROMPT = [
  'You turn a field recording or a typed note into one archive record for a local memory atlas.',
  'Answer with a single JSON object and nothing else. No prose, no markdown fences.',
  'Use only what the source text supports. Never invent coordinates, dates, names or facts.',
  'When the source is vague about a date, put the closest partial date in eventDate, keep it',
  'short ("1998", "1998-04" or "1998-04-12") and set eventDateUncertain to true.',
  'If the source gives no date at all, set eventDate to null and eventDateUncertain to false.',
  'Short place names are fine. Do not add a country or a landmark the speaker did not mention.',
  'needsCorroboration lists claims that a second person or a record should check.',
  'category must be one of: oral-history, natural-feature, local-tradition, environmental-change, observation, built-heritage.',
  'sourceType must be one of: firsthand, recollection, observation, supplied-reference.',
  'Shape: {"title":"","summary":"","category":"","sourceType":"","eventDate":null,',
  '"eventDateUncertain":false,"placeLabel":null,"tags":[],"needsCorroboration":[]}',
].join(' ')

function extractJsonObject(raw: string): unknown {
  const withoutFences = raw.replace(/^[\s\S]*?```(?:json)?/i, '').replace(/```[\s\S]*$/, '').trim()
  const start = withoutFences.indexOf('{')
  const end = withoutFences.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new ExtractionParseError('The model did not return a JSON object.', raw)
  }
  const candidate = withoutFences.slice(start, end + 1)
  try {
    return JSON.parse(candidate)
  } catch (error) {
    throw new ExtractionParseError(
      `The model returned JSON that could not be parsed: ${error instanceof Error ? error.message : 'unknown error'}`,
      raw,
    )
  }
}

const partialDatePattern = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/

function normalisePartialDate(value: unknown): { eventDate: string | null; eventDateUncertain: boolean } {
  if (typeof value !== 'string') return { eventDate: null, eventDateUncertain: false }
  const match = partialDatePattern.exec(value.trim())
  if (!match) return { eventDate: null, eventDateUncertain: false }
  const [, year, month, day] = match
  if (month && Number(month) < 1) return { eventDate: null, eventDateUncertain: false }
  if (month && Number(month) > 12) return { eventDate: null, eventDateUncertain: false }
  if (day && (Number(day) < 1 || Number(day) > 31)) return { eventDate: null, eventDateUncertain: false }
  const normalised = day ? `${year}-${month}-${day}` : month ? `${year}-${month}` : year
  return { eventDate: normalised, eventDateUncertain: true }
}

export function parseExtraction(raw: string): ExtractionResult {
  const payload = extractJsonObject(raw) as Record<string, unknown>
  const date = normalisePartialDate(payload.eventDate)
  const candidate = {
    title: typeof payload.title === 'string' ? payload.title : '',
    summary: typeof payload.summary === 'string' ? payload.summary : '',
    category: payload.category,
    sourceType: payload.sourceType,
    eventDate: date.eventDate,
    eventDateUncertain:
      typeof payload.eventDateUncertain === 'boolean' ? payload.eventDateUncertain : date.eventDateUncertain,
    placeLabel: typeof payload.placeLabel === 'string' && payload.placeLabel.length > 0 ? payload.placeLabel : null,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    needsCorroboration: Array.isArray(payload.needsCorroboration) ? payload.needsCorroboration : [],
  }
  const parsed = extractionSchema.safeParse(candidate)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join('.') || 'result'}: ${issue.message}`)
      .join('; ')
    throw new ExtractionParseError(`The extracted record did not match the required fields. ${detail}`, raw)
  }
  return parsed.data
}

export function eventDatePrecision(eventDate: string | null): 'day' | 'month' | 'year' | null {
  if (!eventDate) return null
  return eventDate.length === 4 ? 'year' : eventDate.length === 7 ? 'month' : 'day'
}

