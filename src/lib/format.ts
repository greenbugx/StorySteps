const recordedFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const preciseFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatRecordedAt(value: string): string {
  return recordedFormatter.format(new Date(value))
}

export function formatRecordedAtPrecise(value: string): string {
  return preciseFormatter.format(new Date(value))
}

export function formatEventDate(value: string): string {
  if (value.length === 4) return value
  if (value.length === 7) {
    const [year, month] = value.split('-')
    return `${monthName(Number(month))} ${year}`
  }
  const [year, month, day] = value.split('-')
  return `${Number(day)} ${monthName(Number(month))} ${year}`
}

function monthName(month: number): string {
  const date = new Date(Date.UTC(2000, month - 1, 1))
  return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date)
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatCoordinate(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative
  return `${Math.abs(value).toFixed(5)}° ${hemisphere}`
}
