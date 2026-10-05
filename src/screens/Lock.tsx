import { useEffect, useState } from 'react'
import { PIN_LENGTH, PinPad } from '../components/PinPad'
import { getAttempts, unlock } from '../lib/store'
import { t } from '../lib/i18n'

export function Lock({ onForgot }: { onForgot: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [waitUntil, setWaitUntil] = useState(0)
  const [, tick] = useState(0)

  useEffect(() => {
    void getAttempts().then((a) => setWaitUntil(a.lockedUntil))
  }, [])

  useEffect(() => {
    if (waitUntil <= Date.now()) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [waitUntil])

  const waiting = waitUntil > Date.now()

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return
    setBusy(true)
    void unlock(pin).then(async (ok) => {
      if (ok) return
      const a = await getAttempts()
      setWaitUntil(a.lockedUntil)
      setError(a.lockedUntil > Date.now() ? t('tooManyTries') : t('wrongPin'))
      setPin('')
      setBusy(false)
    })
  }, [pin])

  return (
    <div className="pt-safe pb-safe flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <PinPad
        title={t('appName')}
        sub={busy ? t('unlocking') : t('enterPin')}
        value={pin}
        onChange={(v) => {
          setError(null)
          setPin(v)
        }}
        error={waiting ? t('waitSeconds', { n: Math.ceil((waitUntil - Date.now()) / 1000) }) : error}
        disabled={busy || waiting}
      />
      <button onClick={onForgot} className="mt-10 text-[15px] text-muted underline-offset-4 active:underline">
        {t('forgotPin')}
      </button>
    </div>
  )
}
