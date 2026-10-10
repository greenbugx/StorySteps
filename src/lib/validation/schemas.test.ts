import { describe, expect, it } from 'vitest'
import { memoryRecordSchema, partialDateSchema } from '@/lib/validation/schemas'
import type { MemoryRecord } from '@/types/memory'

function baseRecord(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: 'mem_test',
    title: 'Stone steps behind the old post office',
    summary: 'Two flights of steps worn smooth on one side.',
    category: 'built-heritage',
    originalText: 'My grandmother used to shortcut through here.',
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
    audioId: null,
    tags: [],
    sourceReferences: [],
    needsCorroboration: [],
    fieldSessionId: null,
    createdAt: '2024-05-04T09:15:00.000Z',
    updatedAt: '2024-05-04T09:15:00.000Z',
    ...overrides,
  }
}

describe('partialDateSchema', () => {
  it('accepts year, month and day precision', () => {
    expect(partialDateSchema.safeParse('1998').success).toBe(true)
    expect(partialDateSchema.safeParse('1998-04').success).toBe(true)
    expect(partialDateSchema.safeParse('1998-04-12').success).toBe(true)
  })

  it('rejects impossible months and days', () => {
    expect(partialDateSchema.safeParse('1998-13').success).toBe(false)
    expect(partialDateSchema.safeParse('1998-02-31').success).toBe(false)
    expect(partialDateSchema.safeParse('12-04-1998').success).toBe(false)
  })
})

describe('memoryRecordSchema', () => {
  it('accepts a memory without coordinates', () => {
    expect(memoryRecordSchema.safeParse(baseRecord()).success).toBe(true)
  })

  it('rejects a memory with only one half of a coordinate pair', () => {
    const result = memoryRecordSchema.safeParse(baseRecord({ latitude: 26.1445 }))
    expect(result.success).toBe(false)
  })

  it('rejects latitude outside the allowed range', () => {
    const result = memoryRecordSchema.safeParse(baseRecord({ latitude: 91, longitude: 0 }))
    expect(result.success).toBe(false)
  })

  it('requires the declared precision to match the event date', () => {
    const result = memoryRecordSchema.safeParse(baseRecord({ eventDate: '1998', eventDatePrecision: 'day' }))
    expect(result.success).toBe(false)
  })

  it('rejects an empty title', () => {
    expect(memoryRecordSchema.safeParse(baseRecord({ title: '   ' })).success).toBe(false)
  })
})
