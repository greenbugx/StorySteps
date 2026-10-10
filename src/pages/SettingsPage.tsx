import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAi } from '@/app/AiContext'
import { useArchive } from '@/app/ArchiveContext'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CapabilityPanel } from '@/components/models/CapabilityPanel'
import { ModelPanel } from '@/components/models/ModelPanel'
import { ArchiveTransfer } from '@/components/settings/ArchiveTransfer'
import { Button } from '@/components/ui/button'
import { orphanAudioAssets, purgeOrphanAudioAssets } from '@/lib/db/memoryRepository'
import { db } from '@/lib/db/database'
import { removeCachedModel } from '@/lib/ai/modelStore'


export function SettingsPage() {
  const { memories, removeAllRecords } = useArchive()
  const { downloadedBytes, download } = useAi()
  const modelStored = downloadedBytes !== null || download.status === 'downloading'
  const [orphans, setOrphans] = useState(0)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [confirmDeleteModels, setConfirmDeleteModels] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void orphanAudioAssets().then((assets) => setOrphans(assets.length))
  }, [memories])

  const deleteAll = async () => {
    setBusy(true)
    try {
      await removeAllRecords()
      toast.success('Every record was deleted from this browser')
    } finally {
      setBusy(false)
    }
  }

  const deleteModels = async () => {
    setBusy(true)
    try {
      await removeCachedModel()
      await db.modelStatus.clear()
      toast.success('Downloaded model files were removed')
    } finally {
      setBusy(false)
    }
  }

  const cleanOrphans = async () => {
    setBusy(true)
    try {
      const removed = await purgeOrphanAudioAssets()
      setOrphans(0)
      toast.success(`Removed ${removed} unlinked ${removed === 1 ? 'recording' : 'recordings'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl text-foreground">AI and storage</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          StorySteps has no account and no server. Records, recordings, transcripts and model files live in this browser
          profile. Clearing site data, or using private browsing, deletes them.
        </p>
      </div>

      <ModelPanel />
      <CapabilityPanel />
      <ArchiveTransfer />

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-paper px-4 py-4">
        <h2 className="font-heading text-lg">Delete local data</h2>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <p className="text-sm">
              {memories.length} {memories.length === 1 ? 'record' : 'records'} in the archive
            </p>
            <p className="text-xs text-ink-muted">
              Removes memories, recordings and field sessions. Model files are kept.
            </p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteAll(true)} disabled={busy}>
            Delete all records
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <p className="text-sm">
              {orphans} unlinked {orphans === 1 ? 'recording' : 'recordings'}
            </p>
            <p className="text-xs text-ink-muted">
              Audio kept when a memory was deleted, or left behind by an interrupted import.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void cleanOrphans()} disabled={busy || orphans === 0}>
            Remove unlinked audio
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm">Downloaded model files</p>
            <p className="text-xs text-ink-muted">Frees several gigabytes. You can download the model again later.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmDeleteModels(true)}
            disabled={busy || !modelStored}
          >
            Delete models
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDeleteAll}
        title="Delete every record on this device?"
        description="Memories, transcripts, recordings and field sessions are removed. This cannot be undone."
        confirmLabel="Delete everything"
        destructive
        onConfirm={deleteAll}
      />

      <ConfirmDialog
        open={confirmDeleteModels}
        title="Delete downloaded model files?"
        description="Local AI will stop working until the model is downloaded again."
        confirmLabel="Delete models"
        destructive
        onConfirm={deleteModels}
      />
    </div>
  )
}
