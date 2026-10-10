import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Archive, Map, Mic, RefreshCw, Settings } from 'lucide-react'
import { ConnectionBadge } from '@/components/layout/ConnectionBadge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { cn } from 'cn'

const navigation = [
  { to: '/atlas', label: 'Atlas', icon: Map },
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/field', label: 'Field session', icon: Mic },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function UpdateNotice() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn('StorySteps could not register its offline cache.', error)
    },
  })
  const [dismissed, setDismissed] = useState(false)
  if (!needRefresh || dismissed) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-moss-soft px-4 py-2 text-sm text-moss">
      <span>A new version of StorySteps is ready.</span>
      <Button size="xs" variant="outline" onClick={() => void updateServiceWorker(true)}>
        <RefreshCw className="size-3" />
        Reload
      </Button>
      <Button size="xs" variant="ghost" onClick={() => setDismissed(true)}>
        Later
      </Button>
    </div>
  )
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <UpdateNotice />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <NavLink to="/atlas" className="font-heading text-xl tracking-tight text-foreground">
              StorySteps
            </NavLink>
            <span className="hidden text-xs text-ink-muted sm:inline">
              Every place has a story. Go outside and find it.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 md:flex">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-1.5 text-sm transition-colors',
                      isActive ? 'bg-moss-soft text-moss' : 'text-ink-muted hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <ConnectionBadge />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-4">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[0.7rem]',
                  isActive ? 'text-moss' : 'text-ink-muted',
                )
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
