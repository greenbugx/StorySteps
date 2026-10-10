import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  createMemory,
  deleteAllRecords,
  deleteMemory,
  listMemories,
  updateMemory,
} from '@/lib/db/memoryRepository'
import { useLiveQuery } from '@/app/useLiveQuery'
import type { MemoryDraft, MemoryRecord } from '@/types/memory'

type ArchiveContextValue = {
  memories: MemoryRecord[]
  ready: boolean
  saveNewMemory: (draft: MemoryDraft) => Promise<MemoryRecord>
  saveMemoryChanges: (id: string, changes: Partial<MemoryDraft>) => Promise<MemoryRecord>
  removeMemory: (id: string, retainAudio: boolean) => Promise<void>
  removeAllRecords: () => Promise<void>
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null)

const readMemories = () => listMemories()

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const archive = useLiveQuery(readMemories, useMemo(() => [], []) as MemoryRecord[])

  const value = useMemo<ArchiveContextValue>(
    () => ({
      memories: archive.value,
      ready: archive.ready,
      saveNewMemory: createMemory,
      saveMemoryChanges: updateMemory,
      removeMemory: deleteMemory,
      removeAllRecords: deleteAllRecords,
    }),
    [archive.value, archive.ready],
  )

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>
}

export function useArchive(): ArchiveContextValue {
  const context = useContext(ArchiveContext)
  if (!context) throw new Error('useArchive must be used inside ArchiveProvider')
  return context
}
