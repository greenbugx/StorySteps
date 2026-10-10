import { describe, expect, it } from 'vitest'
import { ExtractionParseError, parseExtraction } from '@/lib/ai/extraction'

const validPayload = JSON.stringify({
  title: 'The last ferry at Titashpur',
  summary: 'A recollection of the evening crossing before the bridge.',
  category: 'oral-history',
  sourceType: 'recollection',
  eventDate: '1974-06',
  eventDateUncertain: true,
  placeLabel: 'Titashpur ghat',
  tags: ['ferry', 'river'],
  needsCorroboration: ['the year the service stopped'],
})

describe('parseExtraction', () => {
  it('reads a well formed payload', () => {
    const result = parseExtraction(validPayload)
    expect(result.title).toBe('The last ferry at Titashpur')
    expect(result.category).toBe('oral-history')
    expect(result.eventDate).toBe('1974-06')
  })

  it('accepts a payload wrapped in a markdown fence and extra prose', () => {
    const wrapped = `Here you go:\n\`\`\`json\n${validPayload}\n\`\`\`\nHope that helps.`
    expect(parseExtraction(wrapped).placeLabel).toBe('Titashpur ghat')
  })

  it('drops a date it cannot understand instead of inventing one', () => {
    const payload = JSON.parse(validPayload) as Record<string, unknown>
    payload.eventDate = 'sometime in the seventies'
    expect(parseExtraction(JSON.stringify(payload)).eventDate).toBeNull()
  })

  it('marks a year only date as uncertain', () => {
    const payload = JSON.parse(validPayload) as Record<string, unknown>
    payload.eventDate = '1974'
    delete payload.eventDateUncertain
    const result = parseExtraction(JSON.stringify(payload))
    expect(result.eventDate).toBe('1974')
    expect(result.eventDateUncertain).toBe(true)
  })

  it('rejects an unknown category rather than guessing', () => {
    const payload = JSON.parse(validPayload) as Record<string, unknown>
    payload.category = 'ghost-story'
    expect(() => parseExtraction(JSON.stringify(payload))).toThrow(ExtractionParseError)
  })

  it('reports invalid JSON without discarding the raw text', () => {
    const broken = '{"title": "unterminated'
    try {
      parseExtraction(broken)
      throw new Error('expected a parse failure')
    } catch (error) {
      expect(error).toBeInstanceOf(ExtractionParseError)
      expect((error as ExtractionParseError).raw).toBe(broken)
    }
  })
})
