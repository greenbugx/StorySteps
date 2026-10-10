export const TARGET_SAMPLE_RATE = 16_000

export type DecodedAudio = {
  samples: Float32Array
  durationMs: number
  peak: number
  rms: number
}

export function resampleToMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels
  const frameCount = Math.ceil((buffer.duration * TARGET_SAMPLE_RATE))
  const output = new Float32Array(frameCount)
  const ratio = buffer.sampleRate / TARGET_SAMPLE_RATE

  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let index = 0; index < frameCount; index += 1) {
      const position = index * ratio
      const low = Math.floor(position)
      const high = Math.min(low + 1, data.length - 1)
      const weight = position - low
      output[index] += (data[low] * (1 - weight) + data[high] * weight) / channels
    }
  }
  return output
}

export async function decodeAudioBlob(blob: Blob): Promise<DecodedAudio> {
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    const samples = resampleToMono(buffer)
    let peak = 0
    let sumSquares = 0
    for (const value of samples) {
      const magnitude = Math.abs(value)
      if (magnitude > peak) peak = magnitude
      sumSquares += value * value
    }
    return {
      samples,
      durationMs: Math.round(buffer.duration * 1000),
      peak,
      rms: Math.sqrt(sumSquares / Math.max(1, samples.length)),
    }
  } finally {
    await context.close()
  }
}

export type SilenceVerdict = { usable: true } | { usable: false; reason: string }

export function assessRecording(decoded: DecodedAudio, byteLength: number): SilenceVerdict {
  if (decoded.durationMs < 500) {
    return { usable: false, reason: 'That recording is under half a second. Record a little longer.' }
  }
  if (byteLength < 1024) {
    return { usable: false, reason: 'That recording contains almost no audio data.' }
  }
  if (decoded.peak < 0.004) {
    return { usable: false, reason: 'That recording is silent. Check the microphone and try again.' }
  }
  if (decoded.rms < 0.0012) {
    return { usable: false, reason: 'That recording has no audible speech. Check the microphone and try again.' }
  }
  return { usable: true }
}
