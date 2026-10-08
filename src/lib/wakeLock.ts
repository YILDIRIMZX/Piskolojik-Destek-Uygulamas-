import { useEffect } from 'react'

interface Sentinel {
  release(): Promise<void>
}

/**
 * Keeps the screen on while `active` (recording, or an open session).
 * iOS releases the lock when the app goes to the background, so it is re-acquired on return.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const api = (navigator as unknown as { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }).wakeLock
    if (!active || !api) return
    let sentinel: Sentinel | null = null
    let cancelled = false
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      api
        .request('screen')
        .then((s) => {
          if (cancelled) void s.release()
          else sentinel = s
        })
        .catch(() => {})
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}
