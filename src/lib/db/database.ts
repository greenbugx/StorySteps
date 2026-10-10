import Dexie, { type EntityTable } from 'dexie'
import type { AppSetting, AudioAsset, FieldSession, MemoryRecord, ModelStatus } from '@/types/memory'

export const DATABASE_NAME = 'storysteps'

export class StoryStepsDatabase extends Dexie {
  memories!: EntityTable<MemoryRecord, 'id'>
  audioAssets!: EntityTable<AudioAsset, 'id'>
  fieldSessions!: EntityTable<FieldSession, 'id'>
  appSettings!: EntityTable<AppSetting, 'key'>
  modelStatus!: EntityTable<ModelStatus, 'modelId'>

  constructor(name: string = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      memories:
        'id, title, category, verificationStatus, sourceType, recordedAt, eventDate, createdAt, updatedAt, fieldSessionId, *tags',
      audioAssets: 'id, memoryId, createdAt',
      fieldSessions: 'id, startedAt, endedAt',
      appSettings: 'key, updatedAt',
      modelStatus: 'modelId, status, lastVerifiedAt',
    })
    this.version(2)
      .stores({
        memories:
          'id, title, category, verificationStatus, sourceType, recordedAt, eventDate, createdAt, updatedAt, fieldSessionId, *tags',
        audioAssets: 'id, memoryId, createdAt',
        fieldSessions: 'id, startedAt, endedAt',
        appSettings: 'key, updatedAt',
        modelStatus: 'modelId, status, lastVerifiedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<MemoryRecord>('memories')
          .toCollection()
          .modify((record) => {
            if (record.eventDatePrecision === undefined) {
              record.eventDatePrecision = record.eventDate
                ? record.eventDate.length === 4
                  ? 'year'
                  : record.eventDate.length === 7
                    ? 'month'
                    : 'day'
                : null
            }
            if (record.eventDateUncertain === undefined) record.eventDateUncertain = false
            if (record.locationPrecision === undefined) record.locationPrecision = null
            if (record.needsCorroboration === undefined) record.needsCorroboration = []
            if (record.fieldSessionId === undefined) record.fieldSessionId = null
          })
      })
  }
}

export const db = new StoryStepsDatabase()
