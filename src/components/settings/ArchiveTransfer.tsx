import { useState } from 'react'
import { toast } from 'sonner'
import { useArchive } from '@/app/ArchiveContext'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buildArchive, downloadArchive } from '@/lib/export/archiveExporter'
import { ImportValidationError, importArchive, previewImport } from '@/lib/export/archiveImporter'
import type { DuplicatePolicy, ImportPreview } from '@/lib/export/archiveImporter'
import { formatBytes } from '@/lib/ai/modelConfig'

const DUPLICATE_POLICY_LABELS = {
  skip: 'Keep what is already here',
  replace: 'Replace matching records',
}

export function ArchiveTransfer() {
  const { memories } = useArchive()
  const [includeAudio, setIncludeAudio] = useState(false)
  const [exporting, setExporting] = useState<{ completed: number; total: number } | null>(null)
  const [policy, setPolicy] = useState<DuplicatePolicy>('skip')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [confirmingImport, setConfirmingImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [issues, setIssues] = useState<string[]>([])

  const runExport = async () => {
    setExporting({ completed: 0, total: memories.length })
    try {
      const archive = await buildArchive(includeAudio, (progress) =>
        setExporting({ completed: progress.completed, total: progress.total }),
      )
      const filename = downloadArchive(archive)
      toast.success(`Saved ${filename} to your downloads`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The archive could not be exported.')
    } finally {
      setExporting(null)
    }
  }

  const inspectFile = async (file: File) => {
    setIssues([])
    setPreview(null)
    setConfirmingImport(false)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      setPreview(await previewImport(parsed, policy))
    } catch (error) {
      if (error instanceof ImportValidationError) {
        setIssues(error.issues)
        return
      }
      setIssues([error instanceof Error ? error.message : 'That file could not be read as JSON.'])
    }
  }

  const runImport = async () => {
    if (!preview) return
    setImporting(true)
    try {
      const written = await importArchive(preview, policy)
      toast.success(`Imported ${written} ${written === 1 ? 'record' : 'records'}`)
      setPreview(null)
      setConfirmingImport(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The import did not finish.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-paper px-4 py-4">
      <h2 className="font-heading text-lg">Export and import</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Export</h3>
        <p className="max-w-prose text-sm text-ink-muted">
          Writes a versioned JSON file with every record on this device. Nothing is uploaded anywhere.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={includeAudio}
            onCheckedChange={(checked) => setIncludeAudio(checked === true)}
            className="mt-0.5"
          />
          <span>
            Include the audio files
            <span className="block text-xs text-ink-muted">
              Recordings are base64 encoded inside the JSON, so the file becomes much larger.
            </span>
          </span>
        </label>
        {exporting ? (
          <div className="flex flex-col gap-1">
            <Progress
              value={exporting.total === 0 ? 100 : Math.round((exporting.completed / exporting.total) * 100)}
            />
            <p className="text-xs text-ink-muted">
              Preparing {exporting.completed} of {exporting.total} records
            </p>
          </div>
        ) : null}
        <div>
          <Button size="sm" onClick={() => void runExport()} disabled={exporting !== null || memories.length === 0}>
            {exporting ? 'Preparing archive' : 'Export archive'}
          </Button>
          {memories.length === 0 ? <p className="mt-1 text-xs text-ink-muted">There is nothing to export yet.</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium">Import</h3>
        <p className="max-w-prose text-sm text-ink-muted">
          Every field is checked before anything is written. If the file is malformed, nothing on this device changes.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="application/json,.json"
            className="text-sm"
            aria-label="Choose a StorySteps archive"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void inspectFile(file)
            }}
          />
          <Select
            value={policy}
            items={DUPLICATE_POLICY_LABELS}
            onValueChange={(value) => setPolicy(value as DuplicatePolicy)}
          >
            <SelectTrigger size="sm" aria-label="Duplicate policy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Keep what is already here</SelectItem>
              <SelectItem value="replace">Replace matching records</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {issues.length > 0 ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
            <p className="text-sm text-destructive">This file was rejected, so nothing was imported.</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {preview ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <p>
              {preview.newRecords} new {preview.newRecords === 1 ? 'record' : 'records'}, {preview.existingRecords}{' '}
              already present.
            </p>
            <p className="text-xs text-ink-muted">
              {preview.audioCount} {preview.audioCount === 1 ? 'recording' : 'recordings'} ({formatBytes(preview.totalBytes)}
              ) will be restored.
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setConfirmingImport(true)}>
                Import these records
              </Button>
            </div>
          </div>
        ) : null}

        {importing ? <p className="text-xs text-ink-muted">Writing records...</p> : null}
      </div>

      <ConfirmDialog
        open={confirmingImport && preview !== null}
        title="Write these records into this browser?"
        description="The import runs in one transaction. If any record fails, nothing is written."
        confirmLabel="Import"
        onConfirm={runImport}
      >
        <p className="text-sm text-ink-muted">
          {policy === 'replace'
            ? 'Records with the same identifier will be overwritten by the file.'
            : 'Records with the same identifier will be left untouched.'}
        </p>
      </ConfirmDialog>
    </section>
  )
}
