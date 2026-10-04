import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typings for the Web Speech API (Safari exposes it as webkitSpeechRecognition).
interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<RecognitionResult>
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

const Ctor = (): (new () => Recognition) | undefined => {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined
}

export const canRecognize = () => !!Ctor()
export const canSpeak = () => 'speechSynthesis' in window

/**
 * Dictation in Turkish. `base` is the text already in the field; speech is appended to it.
 * With `autoSendAfterMs`, a pause after speech calls `onPause` (used by hands-free mode).
 */
/** iPhone home-screen web apps: Safari's in-app speech recognition is unreliable there. */
export const isIOSStandalone = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  ((navigator as unknown as { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches)

const START_TIMEOUT_MS = 4000

export function useDictation(opts: {
  onText: (text: string) => void
  onPause?: () => void
  autoSendAfterMs?: number
  /** In-app recognition switched on in settings. When off, callers fall back to keyboard dictation. */
  enabled: boolean
}) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  const base = useRef('')
  const finals = useRef('')
  const pauseTimer = useRef<number | undefined>(undefined)
  const startTimer = useRef<number | undefined>(undefined)
  const optsRef = useRef(opts)
  optsRef.current = opts

  /** Always returns the UI to idle, even if the engine never reports back. */
  const reset = useCallback(() => {
    clearTimeout(pauseTimer.current)
    clearTimeout(startTimer.current)
    const r = rec.current
    rec.current = null
    if (r) {
      r.onresult = r.onerror = r.onend = null
      try {
        r.abort()
      } catch {
        /* already stopped */
      }
    }
    setListening(false)
  }, [])

  const stop = useCallback(() => {
    const r = rec.current
    if (!r) return setListening(false)
    try {
      r.stop()
    } catch {
      /* ignore */
    }
    // If the engine doesn't end on its own shortly, force it.
    window.setTimeout(() => {
      if (rec.current === r) reset()
    }, 800)
  }, [reset])

  const start = useCallback(
    (current: string) => {
      const C = Ctor()
      if (!C) {
        setError('Bu cihazda konuşma tanıma yok. Klavyedeki mikrofonu kullanabilirsin.')
        return
      }
      reset()
      window.speechSynthesis?.cancel()
      setError(null)
      base.current = current ? current.replace(/\s*$/, ' ') : ''
      finals.current = ''
      const r = new C()
      r.lang = 'tr-TR'
      r.continuous = true
      r.interimResults = true
      ;(r as unknown as { onstart: (() => void) | null }).onstart = () => clearTimeout(startTimer.current)
      r.onresult = (e) => {
        clearTimeout(startTimer.current)
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finals.current += res[0].transcript
        else interim += res[0].transcript
      }
      optsRef.current.onText((base.current + finals.current + interim).replace(/\s+/g, ' ').trimStart())
      const ms = optsRef.current.autoSendAfterMs
      if (ms) {
        clearTimeout(pauseTimer.current)
        pauseTimer.current = window.setTimeout(() => {
          r.stop()
          optsRef.current.onPause?.()
        }, ms)
      }
    }
      r.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
          setError('Mikrofon izni verilmedi ya da bu modda kullanılamıyor. Klavyedeki mikrofonu kullanabilirsin.')
        else if (e.error !== 'no-speech' && e.error !== 'aborted') setError('Ses anlaşılamadı, tekrar dene.')
        reset()
      }
      r.onend = () => {
        if (rec.current === r) reset()
      }
      rec.current = r
      try {
        r.start()
      } catch {
        reset()
        setError('Konuşma tanıma başlatılamadı. Klavyedeki mikrofonu kullanabilirsin.')
        return
      }
      setListening(true)
      // Some iOS modes never start and never report an error. Give up after a few seconds.
      startTimer.current = window.setTimeout(() => {
        if (rec.current === r && !finals.current) {
          reset()
          setError('Konuşma tanıma yanıt vermedi. Klavyedeki mikrofonu kullanabilirsin.')
        }
      }, START_TIMEOUT_MS)
    },
    [reset],
  )

  useEffect(() => reset, [reset])

  return { listening, start, stop, error, supported: opts.enabled && canRecognize() }
}

let cachedVoice: SpeechSynthesisVoice | null | undefined

const turkishVoice = () => {
  if (cachedVoice !== undefined && cachedVoice !== null) return cachedVoice
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('tr'))
  // Prefer enhanced/premium voices when the user has downloaded them.
  cachedVoice = voices.find((v) => /premium|enhanced|geliş/i.test(v.name)) ?? voices[0] ?? null
  return cachedVoice
}

const plain = (md: string) =>
  md
    .replace(/[*_`#>]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

export function speak(text: string, rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve()
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(plain(text))
    u.lang = 'tr-TR'
    u.rate = rate
    const v = turkishVoice()
    if (v) u.voice = v
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

export const stopSpeaking = () => {
  if (canSpeak()) window.speechSynthesis.cancel()
}
