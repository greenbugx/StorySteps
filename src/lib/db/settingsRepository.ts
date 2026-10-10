import { db } from '@/lib/db/database'
import { appSettingSchema } from '@/lib/validation/schemas'
import type { AppSetting } from '@/types/memory'

export const SETTING_KEYS = {
  onboardingComplete: 'onboarding.complete',
  theme: 'appearance.theme',
  mapCenter: 'map.center',
  defaultCategory: 'memory.defaultCategory',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

export async function readSetting<T>(key: SettingKey, fallback: T): Promise<T> {
  const row = await db.appSettings.get(key)
  if (!row) return fallback
  const parsed = appSettingSchema.safeParse(row)
  if (!parsed.success) return fallback
  return parsed.data.value as T
}

export async function writeSetting(key: SettingKey, value: unknown): Promise<void> {
  const record: AppSetting = { key, value, updatedAt: new Date().toISOString() }
  appSettingSchema.parse(record)
  await db.appSettings.put(record)
}

export async function clearAllSettings(): Promise<void> {
  await db.appSettings.clear()
}
