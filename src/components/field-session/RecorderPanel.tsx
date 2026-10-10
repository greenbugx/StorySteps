import { useEffect, useMemo, useState } from 'react'
import { Circle, Square, Trash2 } from 'lucide-react'
import { useAi } from '@/app/AiContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { VoiceRecorder } from '@/lib/audio/recorder'
import { formatBytes, WHISPER_MODEL } from '@/lib/ai/modelConfig'

type RecorderPanelProps = {
  audio: { blob: Blob; mimeType: string; durationMs: number } | null
  transcript: string
  onTranscriptChange: (value: string) => void
  onAudioChange: (audio: { blob: Blob; mimeType: string; durationMs: number } | null) => void
}

export function RecorderPanel({ audio, transcript, onTranscriptChange, onAudioChange }: RecorderPanelProps) {
  const { capabilities, transcription, transcribe } = useAi()
  const [recorder] = useState(() => new VoiceRecorder())
  const [recording, setRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const objectUrl = useMemo(() => (audio ? URL.createObjectURL(audio.blob) : null), [audio])

  useEffect(() => {
    if (!objectUrl) return
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  useEffect(() => () => recorder.cancel(), [recorder])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setElapsedMs((value) => value + 250), 250)
    return () => window.clearInterval(timer)
  }, [recording])

  const start = async () => {
    setError(null)
    setElapsedMs(0)
    try {
      await recorder.start()
      setRecording(true)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `${cause.message} Typed notes work just as well, so you can keep writing instead.`
          : 'The microphone could not be started. Typed notes work just as well.',
      )
    }
  }

  const stop = async () => {
    try {
      const result = await recorder.stop()
      setRecording(false)
      onAudioChange(result)
    } catch (cause) {
      setRecording(false)
      setError(cause instanceof Error ? cause.message : 'The recording could not be finished.')
    }
  }

  const runTranscription = async () => {
    if (!audio) return
    setError(null)
    const outcome = await transcribe(audio.blob)
    if (outcome.status === 'transcribed') {
      onTranscriptChange(outcome.text)
    } else if (outcome.status === 'rejected') {
      setError(outcome.reason)
    }
  }

  const progressPercent =
    transcription.progress?.phase === 'model' && typeof transcription.progress.progress === 'number'
      ? Math.round(transcription.progress.progress)
      : transcription.progress?.phase === 'model' &&
          transcription.progress.loaded &&
          transcription.progress.total
        ? Math.round((transcription.progress.loaded / transcription.progress.total) * 100)
        : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button type="button" variant="outline" onClick={() => void start()} disabled={!capabilities?.micSupported}>
            <Circle className="size-4 text-destructive" />
            Start recording
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={() => void stop()}>
            <Square className="size-4" />
            Stop ({Math.floor(elapsedMs / 1000)}s)
          </Button>
        )}
        {audio ? (
          <>
            <Button type="button" variant="secondary" onClick={() => void runTranscription()} disabled={transcription.status === 'transcribing'}>
              {transcription.status === 'transcribing' ? 'Transcribing' : 'Transcribe on this device'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onAudioChange(null)
                onTranscriptChange('')
                setError(null)
              }}
            >
              <Trash2 className="size-4" />
              Discard recording
            </Button>
          </>
        ) : null}
      </div>

      <p className="text-xs text-ink-muted">
        Recording stays on this device. If you record someone else, ask them first and tell them how the recording
        will be used.
      </p>

      {progressPercent !== null ? (
        <div className="flex flex-col gap-1">
          <Progress value={progressPercent} />
          <p className="text-xs text-ink-muted">
            {WHISPER_MODEL.label} is being fetched for the first time, about {formatBytes(WHISPER_MODEL.approxBytes)}.
          </p>
        </div>
      ) : null}

      {transcription.status === 'error' && transcription.detail ? (
        <p className="text-xs text-destructive">{transcription.detail}</p>
      ) : null}

      {transcription.status !== 'error' && transcription.detail ? (
        <p className="text-xs text-ochre">{transcription.detail}</p>
      ) : null}

      {transcription.status === 'done' && transcription.device ? (
        <p className="text-xs text-ink-muted">
          Transcribed on this device using{' '}
          {transcription.device === 'webgpu' ? 'the graphics processor' : 'the processor'}.
        </p>
      ) : null}

      {audio && objectUrl ? (
        <div className="flex flex-col gap-1">
          <audio controls src={objectUrl} className="w-full" aria-label="Recorded audio" />
          <p className="text-xs text-ink-muted">
            {(audio.blob.size / 1024).toFixed(0)} KB, {Math.round(audio.durationMs / 100) / 10}s
          </p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <label className="flex flex-col gap-1 text-xs text-ink-muted">
        Transcript (edit freely, the recording is kept)
        <textarea
          value={transcript}
          onChange={(event) => onTranscriptChange(event.target.value)}
          rows={5}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Type what was said, or transcribe a recording above."
        />
      </label>
      <p className="text-xs text-ink-muted">
        Transcription accuracy depends on the model size, accent and background noise. Check the text before saving.
      </p>
    </div>
  )
}
