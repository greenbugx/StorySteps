export function createId(prefix: string): string {
  const random = crypto.randomUUID()
  return `${prefix}_${random}`
}

export function isStableId(value: string): boolean {
  return /^[a-z]+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
}
