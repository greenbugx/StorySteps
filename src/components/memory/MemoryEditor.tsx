import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { MemoryEditorValue } from '@/components/memory/memoryEditor'
import {
  CATEGORY_LABELS,
  MEMORY_CATEGORIES,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  VERIFICATION_STATUSES,
  VERIFICATION_LABELS,
} from '@/types/memory'
import type { MemoryCategory, SourceType, VerificationStatus } from '@/types/memory'

const CATEGORY_ITEMS: Record<MemoryCategory, string> = CATEGORY_LABELS
const SOURCE_TYPE_ITEMS: Record<SourceType, string> = SOURCE_TYPE_LABELS
const VERIFICATION_ITEMS: Record<VerificationStatus, string> = VERIFICATION_LABELS

type MemoryEditorProps = {
  value: MemoryEditorValue
  errors: Record<string, string>
  onChange: (value: MemoryEditorValue) => void
  disabled?: boolean
  showTranscript?: boolean
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-muted">{label}</span>
        {children}
      </label>
      {hint && !error ? <p className="text-xs text-ink-muted/80">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function MemoryEditor({ value, errors, onChange, disabled = false, showTranscript = true }: MemoryEditorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Title" error={errors.title}>
          <Input
            id="memory-title"
            aria-invalid={errors.title ? true : undefined}
            value={value.title}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
            placeholder="The stone steps behind the old post office"
          />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="Short summary" error={errors.summary}>
          <Textarea
            id="memory-summary"
            aria-invalid={errors.summary ? true : undefined}
            rows={2}
            value={value.summary}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, summary: event.target.value })}
            placeholder="Two sentences a stranger could read and understand the place."
          />
        </Field>
      </div>

      <Field label="Category">
        <Select
          value={value.category}
          items={CATEGORY_ITEMS}
          onValueChange={(category) => onChange({ ...value, category: category as MemoryEditorValue['category'] })}
        >
          <SelectTrigger id="memory-category" className="w-full" disabled={disabled} aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMORY_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Source">
        <Select
          value={value.sourceType}
          items={SOURCE_TYPE_ITEMS}
          onValueChange={(sourceType) =>
            onChange({ ...value, sourceType: sourceType as MemoryEditorValue['sourceType'] })
          }
        >
          <SelectTrigger id="memory-source" className="w-full" disabled={disabled} aria-label="Source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_TYPES.map((sourceType) => (
              <SelectItem key={sourceType} value={sourceType}>
                {SOURCE_TYPE_LABELS[sourceType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Verification">
        <Select
          value={value.verificationStatus}
          items={VERIFICATION_ITEMS}
          onValueChange={(status) =>
            onChange({ ...value, verificationStatus: status as MemoryEditorValue['verificationStatus'] })
          }
        >
          <SelectTrigger id="memory-verification" className="w-full" disabled={disabled} aria-label="Verification">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERIFICATION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {VERIFICATION_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="When it was recorded"
        error={errors.recordedAt}
        hint="The date you captured this, which is not the same as when it happened."
      >
        <Input
          id="memory-recorded-at"
          type="datetime-local"
          value={value.recordedAt}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, recordedAt: event.target.value })}
        />
      </Field>

      <Field
        label="When it happened"
        error={errors.eventDate}
        hint="Use a year, a year and month, or a full date. Leave it empty if the source does not say."
      >
        <Input
          id="memory-event-date"
          aria-invalid={errors.eventDate ? true : undefined}
          value={value.eventDate}
          placeholder="1998 or 1998-04 or 1998-04-12"
          disabled={disabled}
          onChange={(event) => onChange({ ...value, eventDate: event.target.value })}
        />
      </Field>

      <Field label="Place name" error={errors.placeLabel}>
        <Input
          id="memory-place"
          aria-invalid={errors.placeLabel ? true : undefined}
          value={value.placeLabel}
          disabled={disabled}
          placeholder="Old post office, Guwahati"
          onChange={(event) => onChange({ ...value, placeLabel: event.target.value })}
        />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Original note" error={errors.originalText}>
          <Textarea
            id="memory-original"
            rows={6}
            value={value.originalText}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, originalText: event.target.value })}
            placeholder="Write what you saw or heard. This text is kept exactly as you typed it."
          />
        </Field>
      </div>

      {showTranscript ? (
        <div className="sm:col-span-2">
          <Field label="Transcript">
            <Textarea
              id="memory-transcript"
              rows={4}
              value={value.transcript}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, transcript: event.target.value })}
              placeholder="The spoken words, transcribed by you or by the local model."
            />
          </Field>
        </div>
      ) : null}

      <Field label="Tags" hint="One tag per line.">
        <Textarea
          id="memory-tags"
          rows={3}
          value={value.tags}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, tags: event.target.value })}
        />
      </Field>

      <Field label="Source references" hint="One reference per line, such as a book or a person.">
        <Textarea
          id="memory-references"
          rows={3}
          value={value.sourceReferences}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, sourceReferences: event.target.value })}
        />
      </Field>
    </div>
  )
}
