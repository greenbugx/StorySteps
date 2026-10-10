import { useNavigate } from 'react-router-dom'
import { ArrowRight, Download, Mic, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes, GEMMA_MODEL } from '@/lib/ai/modelConfig'
import { SETTING_KEYS, writeSetting } from '@/lib/db/settingsRepository'

const steps = [
  {
    icon: PenLine,
    title: 'Write first, model later',
    body: 'Notes, transcripts, dates and places are saved straight away. Local AI is an extra step you can take whenever you want.',
  },
  {
    icon: Mic,
    title: 'Record a conversation',
    body: 'Ask the person in front of you, press record, and stop when the story ends. The microphone is only opened after you press the button.',
  },
  {
    icon: Download,
    title: 'Download the model on purpose',
    body: `Gemma runs on your device once you download about ${formatBytes(GEMMA_MODEL.approxBytes)} from Hugging Face. Nothing is sent anywhere.`,
  },
]

export function WelcomePage() {
  const navigate = useNavigate()

  const finish = async (downloadModel: boolean) => {
    await writeSetting(SETTING_KEYS.onboardingComplete, true)
    if (downloadModel) {
      navigate('/settings')
      return
    }
    navigate('/field')
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6">
      <header className="flex flex-col gap-3">
        <p className="text-xs tracking-[0.18em] text-ink-muted uppercase">StorySteps</p>
        <h1 className="font-heading text-4xl leading-tight text-foreground">
          Every place has a story. Go outside and find it.
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          StorySteps turns walks, conversations and observations into an atlas of local memories: oral histories,
          disappearing landmarks, local traditions and environmental change. It is a private notebook that never phones
          home.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.title} className="rounded-lg border border-border bg-paper px-4 py-3">
            <step.icon className="size-4 text-moss" />
            <h2 className="mt-2 font-heading text-base">{step.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ul>

      <section className="rounded-lg border border-border bg-paper px-4 py-4">
        <h2 className="font-heading text-lg">What stays on this device</h2>
        <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-ink-muted">
          <li>Records, audio and transcripts are written to this browser profile.</li>
          <li>Map tiles come from OpenStreetMap while you are online, and nothing about your notes is sent with them.</li>
          <li>Model inference runs locally. StorySteps never falls back to a hosted model.</li>
          <li>Browser storage is not a safe or encrypted backup. Anyone using this browser profile can read these records.</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void finish(false)}>
          Start with a written note
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="outline" onClick={() => void finish(true)}>
          Show me the model settings
        </Button>
      </div>

      <p className="text-xs text-ink-muted">
        Nothing is requested until you use it: no microphone, no location, no camera.
      </p>
    </div>
  )
}
