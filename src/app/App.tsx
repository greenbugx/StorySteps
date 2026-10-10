import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AiProvider } from '@/app/AiContext'
import { ArchiveProvider } from '@/app/ArchiveContext'
import { AppShell } from '@/components/layout/AppShell'
import { readSetting, SETTING_KEYS } from '@/lib/db/settingsRepository'
import { ArchivePage } from '@/pages/ArchivePage'
import { AtlasPage } from '@/pages/AtlasPage'
import { FieldSessionPage } from '@/pages/FieldSessionPage'
import { MemoryPage } from '@/pages/MemoryPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { WelcomePage } from '@/pages/WelcomePage'

function OnboardingGate() {
  const location = useLocation()
  const [onboarding, setOnboarding] = useState<{ path: string; complete: boolean | null }>({
    path: location.pathname,
    complete: null,
  })

  useEffect(() => {
    let active = true
    void readSetting(SETTING_KEYS.onboardingComplete, false).then((complete) => {
      if (active) setOnboarding({ path: location.pathname, complete })
    })
    return () => {
      active = false
    }
  }, [location.pathname])

  if (onboarding.path !== location.pathname || onboarding.complete === null) return null
  if (!onboarding.complete && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />
  }
  return null
}

export default function App() {
  return (
    <AiProvider>
      <ArchiveProvider>
        <OnboardingGate />
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/atlas" replace />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/atlas" element={<AtlasPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/field" element={<FieldSessionPage />} />
            <Route path="/memories/:memoryId" element={<MemoryPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ArchiveProvider>
    </AiProvider>
  )
}
