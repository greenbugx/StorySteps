import { db } from '@/lib/db/database'
import { createId } from '@/lib/ids'
import { fieldSessionSchema } from '@/lib/validation/schemas'
import type { FieldSession } from '@/types/memory'

export async function listFieldSessions(): Promise<FieldSession[]> {
  const sessions = await db.fieldSessions.toArray()
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function getFieldSession(id: string): Promise<FieldSession | undefined> {
  return db.fieldSessions.get(id)
}

export async function startFieldSession(label: string): Promise<FieldSession> {
  const session: FieldSession = {
    id: createId('ses'),
    label,
    startedAt: new Date().toISOString(),
    endedAt: null,
    startLatitude: null,
    startLongitude: null,
    endLatitude: null,
    endLongitude: null,
    notes: '',
    memoryIds: [],
  }
  fieldSessionSchema.parse(session)
  await db.fieldSessions.add(session)
  return session
}

export async function updateFieldSession(id: string, changes: Partial<FieldSession>): Promise<FieldSession> {
  const existing = await db.fieldSessions.get(id)
  if (!existing) throw new Error('That field session no longer exists')
  const record = fieldSessionSchema.parse({ ...existing, ...changes, id: existing.id })
  await db.fieldSessions.put(record)
  return record
}

export async function endFieldSession(id: string): Promise<FieldSession> {
  return updateFieldSession(id, { endedAt: new Date().toISOString() })
}
