export type RecordingResult = {
  blob: Blob
  mimeType: string
  durationMs: number
}

export class MicrophoneUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MicrophoneUnavailableError'
  }
}

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

export class VoiceRecorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private startedAt = 0

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicrophoneUnavailableError('This browser cannot record audio.')
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickMimeType()
    try {
      this.recorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream)
    } catch (error) {
      this.releaseStream()
      throw new MicrophoneUnavailableError(
        error instanceof Error ? error.message : 'The microphone could not be started.',
      )
    }
    this.chunks = []
    this.startedAt = performance.now()
    this.recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) this.chunks.push(event.data)
    }
    this.recorder.start(1000)
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording'
  }

  async stop(): Promise<RecordingResult> {
    const recorder = this.recorder
    if (!recorder) throw new MicrophoneUnavailableError('No recording is in progress.')
    const stopped = Promise.withResolvers<void>()
    recorder.onstop = () => stopped.resolve()
    if (recorder.state !== 'inactive') recorder.stop()
    await stopped.promise
    const durationMs = Math.round(performance.now() - this.startedAt)
    const mimeType = recorder.mimeType || 'audio/webm'
    const blob = new Blob(this.chunks, { type: mimeType })
    this.recorder = null
    this.chunks = []
    this.releaseStream()
    return { blob, mimeType, durationMs }
  }

  cancel(): void {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    this.recorder = null
    this.chunks = []
    this.releaseStream()
  }

  private releaseStream(): void {
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = null
  }
}

export type PositionReading = { latitude: number; longitude: number; accuracyMeters: number }

export async function requestCurrentPosition(): Promise<PositionReading> {
  if (!navigator.geolocation) {
    throw new Error('This browser cannot report your location.')
  }
  const reading = Promise.withResolvers<PositionReading>()
  navigator.geolocation.getCurrentPosition(
    (position) =>
      reading.resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      }),
    (error) => reading.reject(new Error(error.message || 'Location permission was not granted.')),
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
  )
  return reading.promise
}
