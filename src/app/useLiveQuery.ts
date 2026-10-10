import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

export type LiveQueryResult<T> = {
  value: T
  ready: boolean
}

export function useLiveQuery<T>(querier: () => Promise<T>, initialValue: T): LiveQueryResult<T> {
  const [value, setValue] = useState<T>(initialValue)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: (result) => {
        setValue(result)
        setReady(true)
      },
      error: (cause: unknown) => {
        throw cause instanceof Error ? cause : new Error('The archive could not be read from this device.')
      },
    })
    return () => subscription.unsubscribe()
  }, [querier])

  return { value, ready }
}
