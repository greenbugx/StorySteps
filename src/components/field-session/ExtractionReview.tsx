import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAi } from '@/app/AiContext'
import { Button } from '@/components/ui/button'
import type { ExtractionResult } from '@/lib/ai/extraction'
import { formatEventDate } from '@/lib/format'
import { CATEGORY_LABELS, SOURCE_TYPE_LABELS } from '@/types/memory'

type ExtractionReviewProps = {
  sourceText: string
  onApply: (result: ExtractionResult) => void
}

export function ExtractionReview({ sourceText, onApply }: ExtractionReviewProps) {
  const { extractMemory, download, downloadedBytes } = useAi()
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      setResult(await extractMemory(sourceText))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The local model could not read this note.')
    } finally {
      setRunning(false)
    }
  }

  if (downloadedBytes === null) {
    return (
      <p className="text-xs text-ink-muted">
        Local AI is not downloaded on this device. Everything else on this page works without it. You can download the
        model in Settings when you want structured extraction.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void run()} disabled={running}>
          <Sparkles className="size-4" />
          {running ? 'Reading with the local model' : result ? 'Run again' : 'Extract fields with local AI'}
        </Button>
        {running ? <span className="text-xs text-ink-muted">{download.detail}</span> : null}
      </div>

      <p className="text-xs text-ink-muted">
        The model only reads this note on your device. It can be wrong, so check every field before saving. AI output is
        never marked as verified history.
      </p>

      {error ? (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
          <p className="text-xs text-ink-muted">
            Your original text is untouched. Retry, or continue with the manual fields above.
          </p>
          <Button type="button" size="xs" variant="outline" onClick={() => void run()}>
            Try again
          </Button>
        </div>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-paper px-3 py-3">
          <dl className="grid gap-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-xs text-ink-muted">Suggested title</dt>
              <dd className="font-heading">{result.title}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-xs text-ink-muted">Summary</dt>
              <dd className="text-ink-muted">{result.summary || 'No summary proposed.'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-xs text-ink-muted">Category</dt>
              <dd>{CATEGORY_LABELS[result.category]}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-xs text-ink-muted">Source</dt>
              <dd>{SOURCE_TYPE_LABELS[result.sourceType]}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-xs text-ink-muted">Event date</dt>
              <dd>
                {result.eventDate ? formatEventDate(result.eventDate) : 'Not stated'}
                {result.eventDate && result.eventDateUncertain ? ' (approximate)' : ''}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-xs text-ink-muted">Place</dt>
              <dd>{result.placeLabel ?? 'Not stated'}</dd>
            </div>
            {result.tags.length > 0 ? (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-xs text-ink-muted">Tags</dt>
                <dd className="text-ink-muted">{result.tags.join(', ')}</dd>
              </div>
            ) : null}
            {result.needsCorroboration.length > 0 ? (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-xs text-ink-muted">Check later</dt>
                <dd className="text-ink-muted">
                  <ul className="list-disc pl-4">
                    {result.needsCorroboration.map((claim) => (
                      <li key={claim}>{claim}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => onApply(result)}>
              Use these fields
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
