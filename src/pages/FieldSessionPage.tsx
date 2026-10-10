import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useArchive } from '@/app/ArchiveContext'
import { ExtractionReview } from '@/components/field-session/ExtractionReview'
import { LocationPicker, type LocationValue } from '@/components/field-session/LocationPicker'
import { RecorderPanel } from '@/components/field-session/RecorderPanel'
import { MemoryEditor } from '@/components/memory/MemoryEditor'
import {
  editorValueToDraft,
  emptyMemoryEditorValue,
  validateEditorValue,
  type MemoryEditorValue,
} from '@/components/memory/memoryEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { endFieldSession, listFieldSessions, startFieldSession } from '@/lib/db/fieldSessionRepository'
import { saveAudioAsset } from '@/lib/db/memoryRepository'
import type { ExtractionResult } from '@/lib/ai/extraction'

type PendingAudio = { blob: Blob; mimeType: string; durationMs: number }

export function FieldSessionPage() {
  const { saveNewMemory, saveMemoryChanges } = useArchive()
  const navigate = useNavigate()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionLabel, setSessionLabel] = useState('')
  const [sessions, setSessions] = useState<{ id: string; label: string; startedAt: string; endedAt: string | null }[]>([])
  const [value, setValue] = useState<MemoryEditorValue>(emptyMemoryEditorValue)
  const [location, setLocation] = useState<LocationValue>({ latitude: null, longitude: null, precision: null })
  const [audio, setAudio] = useState<PendingAudio | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void listFieldSessions().then(setSessions)
  }, [])

  const sourceText = useMemo(() => {
    const parts = [value.originalText.trim(), value.transcript.trim()].filter((part) => part.length > 0)
    return parts.join('\n\n')
  }, [value.originalText, value.transcript])

  const beginSession = async () => {
    const label = sessionLabel.trim() || `Walk on ${new Date().toLocaleDateString()}`
    const session = await startFieldSession(label)
    setSessionId(session.id)
    setSessions(await listFieldSessions())
    toast.success('Field session started. Notes are saved on this device as you write them.')
  }

  const finishSession = async () => {
    if (!sessionId) return
    await endFieldSession(sessionId)
    setSessionId(null)
    setSessions(await listFieldSessions())
    toast.success('Field session closed')
  }

  const applyExtraction = (result: ExtractionResult) => {
    setValue((current) => ({
      ...current,
      title: current.title.trim() === '' ? result.title : current.title,
      summary: current.summary.trim() === '' ? result.summary : current.summary,
      category: result.category,
      sourceType: result.sourceType,
      eventDate: current.eventDate.trim() === '' && result.eventDate ? result.eventDate : current.eventDate,
      placeLabel: current.placeLabel.trim() === '' && result.placeLabel ? result.placeLabel : current.placeLabel,
      tags: current.tags.trim() === '' ? result.tags.join('\n') : current.tags,
    }))
    toast.success('Fields filled in. Check them before saving.')
  }

  const save = async () => {
    const validationErrors = validateEditorValue(value)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setSaving(true)
    try {
      const draft = editorValueToDraft(value)
      const record = await saveNewMemory({
        ...draft,
        latitude: location.latitude,
        longitude: location.longitude,
        locationPrecision: location.precision,
        fieldSessionId: sessionId,
      })
      if (audio) {
        const asset = await saveAudioAsset({
          memoryId: record.id,
          blob: audio.blob,
          mimeType: audio.mimeType,
          durationMs: audio.durationMs,
          fileSizeBytes: audio.blob.size,
        })
        await saveMemoryChanges(record.id, { audioId: asset.id })
      }
      toast.success('Memory saved to this device')
      navigate(`/memories/${record.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The memory could not be saved.'
      setErrors({ form: message })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Field session</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Write down what you saw or heard while you are still there. Everything stays in this browser. The microphone,
          the map and the local model are all optional.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-paper px-4 py-3">
        <h2 className="font-heading text-base">Session</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-ink-muted">
            Name this walk
            <Input
              value={sessionLabel}
              placeholder="Morning walk through the old town"
              onChange={(event) => setSessionLabel(event.target.value)}
              disabled={sessionId !== null}
            />
          </label>
          {sessionId === null ? (
            <Button type="button" onClick={() => void beginSession()}>
              Start session
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => void finishSession()}>
              End session
            </Button>
          )}
        </div>
        {sessions.length > 0 ? (
          <p className="text-xs text-ink-muted">
            {sessions.length} saved {sessions.length === 1 ? 'session' : 'sessions'}. Most recent:{' '}
            {sessions[0].label}, {new Date(sessions[0].startedAt).toLocaleDateString()}.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg">New memory</h2>
        <MemoryEditor value={value} errors={errors} onChange={setValue} disabled={saving} showTranscript={false} />

        <Separator />

        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-base">Audio</h3>
          <RecorderPanel
            audio={audio}
            transcript={value.transcript}
            onTranscriptChange={(transcript) => setValue((current) => ({ ...current, transcript }))}
            onAudioChange={setAudio}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-base">Place</h3>
          <LocationPicker value={location} onChange={setLocation} />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-base">Local AI (optional)</h3>
          <ExtractionReview sourceText={sourceText || 'No note text yet.'} onApply={applyExtraction} />
        </div>

        {errors.form ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.form}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving' : 'Save memory'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/archive')}>
            Cancel
          </Button>
        </div>
      </section>
    </div>
  )
}
