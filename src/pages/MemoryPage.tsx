import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useArchive } from '@/app/ArchiveContext'
import { CategoryBadge } from '@/components/archive/CategoryBadge'
import { LocationPicker, type LocationValue } from '@/components/field-session/LocationPicker'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { MemoryEditor } from '@/components/memory/MemoryEditor'
import {
  editorValueFromRecord,
  editorValueToDraft,
  validateEditorValue,
  type MemoryEditorValue,
} from '@/components/memory/memoryEditor'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getAudioAsset, purgeOrphanAudioAssets } from '@/lib/db/memoryRepository'
import { formatCoordinate, formatDuration, formatEventDate, formatRecordedAtPrecise } from '@/lib/format'
import {
  SOURCE_TYPE_LABELS,
  VERIFICATION_LABELS,
  type AudioAsset,
} from '@/types/memory'

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function MemoryPage() {
  const { memoryId } = useParams()
  const navigate = useNavigate()
  const { memories, ready, saveMemoryChanges, removeMemory } = useArchive()
  const record = useMemo(
    () => memories.find((memory) => memory.id === memoryId) ?? null,
    [memories, memoryId],
  )
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<MemoryEditorValue | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [audio, setAudio] = useState<AudioAsset | null>(null)
  const [location, setLocation] = useState<LocationValue>({
    latitude: null,
    longitude: null,
    precision: null,
  })
  const [confirming, setConfirming] = useState(false)
  const [retainAudio, setRetainAudio] = useState(false)

  const audioId = record?.audioId ?? null
  useEffect(() => {
    if (!audioId) return
    let active = true
    void getAudioAsset(audioId).then((asset) => {
      if (active) setAudio(asset ?? null)
    })
    return () => {
      active = false
    }
  }, [audioId])

  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio.blob) : null), [audio])

  useEffect(() => {
    if (!audioUrl) return
    return () => URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  if (!ready) {
    return <p className="text-sm text-ink-muted">Reading the archive on this device.</p>
  }

  if (!record) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-heading text-2xl">This memory is not here</h1>
        <p className="text-sm text-ink-muted">
          It may have been deleted, or it belongs to a different browser profile.
        </p>
        <Button render={<Link to="/archive" />} variant="outline">
          Back to the archive
        </Button>
      </div>
    )
  }

  const startEditing = () => {
    setDraft(editorValueFromRecord(record))
    setLocation({
      latitude: record.latitude,
      longitude: record.longitude,
      precision: record.locationPrecision,
    })
    setErrors({})
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!draft) return
    const validationErrors = validateEditorValue(draft)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    const changes = editorValueToDraft(draft)
    await saveMemoryChanges(record.id, {
      title: changes.title,
      summary: changes.summary,
      category: changes.category,
      sourceType: changes.sourceType,
      verificationStatus: changes.verificationStatus,
      originalText: changes.originalText,
      transcript: changes.transcript,
      recordedAt: changes.recordedAt,
      eventDate: changes.eventDate,
      eventDatePrecision: changes.eventDatePrecision,
      placeLabel: changes.placeLabel,
      tags: changes.tags,
      sourceReferences: changes.sourceReferences,
      latitude: location.latitude,
      longitude: location.longitude,
      locationPrecision: location.precision,
    })
    setEditing(false)
    toast.success('Changes saved on this device')
  }

  const deleteRecord = async () => {
    await removeMemory(record.id, retainAudio)
    if (retainAudio) {
      await purgeOrphanAudioAssets()
    }
    toast.success('Memory deleted')
    navigate('/archive')
  }

  if (editing && draft) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <ArrowLeft className="size-4" />
            Back to the record
          </Button>
        </div>
        <h1 className="font-heading text-2xl">Edit memory</h1>
        <MemoryEditor value={draft} errors={errors} onChange={setDraft} />
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-base">Place</h2>
          <LocationPicker value={location} onChange={setLocation} />
        </div>
        {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}
        <div className="flex gap-2">
          <Button onClick={() => void saveEdit()}>Save changes</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <article className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/archive" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-foreground">
          <ArrowLeft className="size-4" />
          Archive
        </Link>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={startEditing}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <h1 className="font-heading text-3xl leading-tight text-foreground">{record.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <CategoryBadge category={record.category} />
          <span>{SOURCE_TYPE_LABELS[record.sourceType]}</span>
          <span>{VERIFICATION_LABELS[record.verificationStatus]}</span>
        </div>
      </header>

      {record.summary ? (
        <p className="max-w-prose text-lg leading-relaxed text-foreground/90">{record.summary}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex flex-col gap-4">
          {record.originalText ? (
            <section>
              <h2 className="font-heading text-base text-ink-muted">Note as written</h2>
              <p className="record-drop-cap mt-2 max-w-prose text-base leading-relaxed whitespace-pre-wrap text-foreground/90">
                {record.originalText}
              </p>
            </section>
          ) : null}

          {record.transcript ? (
            <section>
              <h2 className="font-heading text-base text-ink-muted">Transcript</h2>
              <p className="mt-2 max-w-prose whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                {record.transcript}
              </p>
            </section>
          ) : null}

          {!record.originalText && !record.transcript ? (
            <p className="text-sm text-ink-muted">This memory has no note text yet. Use Edit to add what was said.</p>
          ) : null}

          {audio && audioUrl ? (
            <section className="flex flex-col gap-2">
              <h2 className="font-heading text-base text-ink-muted">Recording</h2>
              <audio controls src={audioUrl} className="w-full" aria-label="Attached recording" />
              <p className="text-xs text-ink-muted">
                {formatDuration(audio.durationMs)}, {(audio.fileSizeBytes / 1024).toFixed(0)} KB, stored on this
                device.
              </p>
            </section>
          ) : null}

          {record.needsCorroboration.length > 0 ? (
            <section>
              <h2 className="font-heading text-base text-ink-muted">Still to check</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-foreground/90">
                {record.needsCorroboration.map((claim) => (
                  <li key={claim}>{claim}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <dl className="rounded-lg border border-border bg-paper px-3 py-1">
            <MetaRow label="Recorded">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-ink-muted" />
                {formatRecordedAtPrecise(record.recordedAt)}
              </span>
            </MetaRow>
            <MetaRow label="Reported event date">
              {record.eventDate ? (
                <span>
                  {formatEventDate(record.eventDate)}
                  {record.eventDateUncertain ? ' (approximate)' : ''}
                </span>
              ) : (
                <span className="text-ink-muted">Not stated</span>
              )}
            </MetaRow>
            <MetaRow label="Place">
              {record.placeLabel ? (
                <Link to={`/timeline?place=${encodeURIComponent(record.placeLabel)}`} className="text-moss hover:underline">
                  {record.placeLabel}
                </Link>
              ) : (
                <span className="text-ink-muted">No place name</span>
              )}
            </MetaRow>
            <MetaRow label="Coordinates">
              {record.latitude !== null && record.longitude !== null ? (
                <span className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-ink-muted" />
                    {formatCoordinate(record.latitude, 'N', 'S')},{' '}
                    {formatCoordinate(record.longitude, 'E', 'W')}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {record.locationPrecision === 'device'
                      ? 'Taken from this device.'
                      : 'Entered by hand, treat it as an estimate.'}
                  </span>
                </span>
              ) : (
                <span className="text-ink-muted">Not located</span>
              )}
            </MetaRow>
            {record.tags.length > 0 ? (
              <MetaRow label="Tags">
                <span className="flex flex-wrap gap-1.5">
                  {record.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </span>
              </MetaRow>
            ) : null}
            {record.sourceReferences.length > 0 ? (
              <MetaRow label="References">
                <ul className="list-disc pl-4">
                  {record.sourceReferences.map((reference) => (
                    <li key={reference}>{reference}</li>
                  ))}
                </ul>
              </MetaRow>
            ) : null}
            <MetaRow label="Last edited">{formatRecordedAtPrecise(record.updatedAt)}</MetaRow>
          </dl>

          <Separator />

          <p className="text-xs leading-relaxed text-ink-muted">
            Verification is your own judgement. StorySteps does not check these claims against any outside source.
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete this memory?"
        description="The note, its transcript and its metadata are removed from this browser. This cannot be undone."
        confirmLabel="Delete memory"
        destructive
        onConfirm={deleteRecord}
      >
        {record.audioId ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={retainAudio}
              onChange={(event) => setRetainAudio(event.target.checked)}
              className="mt-1"
            />
            <span>
              Keep the recording file instead of deleting it with the memory
              <span className="block text-xs text-ink-muted">
                Kept recordings can be cleaned up from Settings.
              </span>
            </span>
          </label>
        ) : null}
      </ConfirmDialog>
    </article>
  )
}
