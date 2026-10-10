import { Blob as NodeBlob } from 'node:buffer'
import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'
import { db } from '@/lib/db/database'

globalThis.Blob = NodeBlob as unknown as typeof Blob

afterEach(async () => {
  await Promise.all([
    db.memories.clear(),
    db.audioAssets.clear(),
    db.fieldSessions.clear(),
    db.appSettings.clear(),
    db.modelStatus.clear(),
  ])
})
