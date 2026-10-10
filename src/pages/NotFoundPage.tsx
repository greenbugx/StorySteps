import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="font-heading text-2xl text-foreground">That page is not part of the atlas</h1>
      <p className="max-w-prose text-sm text-ink-muted">
        The address you followed does not match anything in StorySteps. The archive and the map are still where you left
        them.
      </p>
      <Button render={<Link to="/atlas" />}>Back to the atlas</Button>
    </div>
  )
}
