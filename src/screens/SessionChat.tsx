import { ArrowUp, CaretLeft, Headphones, Microphone, SpeakerHigh, SpeakerSlash, Stop, Timer } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EmergencyButton } from '../components/Emergency'
import { KEYBOARD_HINT } from '../components/MicButton'
import { Button, Sheet, cx } from '../components/ui'
import { describeError } from '../lib/claude'
import { renderMarkdown } from '../lib/markdown'
import { canSpeak, speak, stopSpeaking, useDictation } from '../lib/speech'
import { flush, update, useV } from '../lib/store'
import { useNav } from '../nav'
import { fmtUsd } from './Sessions'
import { addActiveTime, close, generateReport, remainingMinutes, reply, send, start } from './sessionLogic'

const TICK_MS = 5000

export function SessionChat({ id }: { id: string }) {
  const v = useV()
  const nav = useNav()
  const reduce = useReducedMotion()
  const s = v.sessions.find((x) => x.id === id)
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [endSheet, setEndSheet] = useState(false)
  const [reporting, setReporting] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abort = useRef<AbortController | null>(null)
  const draftRef = useRef('')
  draftRef.current = draft

  const { readAloud, handsFree, speechRate, voiceURI } = v.settings
  const setSetting = (patch: Partial<typeof v.settings>) => update((x) => ({ ...x, settings: { ...x.settings, ...patch } }))

  // The 50-minute clock only runs while this screen is visible.
  useEffect(() => {
    if (!s || s.status !== 'active') return
    let last = Date.now()
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') {
        last = Date.now()
        return
      }
      const now = Date.now()
      addActiveTime(id, now - last)
      last = now
    }, TICK_MS)
    return () => clearInterval(t)
  }, [id, s?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }))
  }, [reduce])

  const dictation = useDictation({
    onText: setDraft,
    autoSendAfterMs: handsFree ? 2200 : undefined,
    onPause: () => {
      if (draftRef.current.trim()) void submit(draftRef.current)
    },
    enabled: v.settings.inAppSpeech,
  })
  const [kbHint, setKbHint] = useState(false)

  const afterReply = useCallback(
    async (text: string | undefined) => {
      if (!text) return
      if (readAloud || handsFree) await speak(text, speechRate, voiceURI)
      if (handsFree && dictation.supported) dictation.start('')
    },
    [readAloud, handsFree, speechRate, voiceURI, dictation],
  )

  const run = useCallback(
    async (fn: (onText: (t: string) => void, signal: AbortSignal) => Promise<string | undefined | void>) => {
      setBusy(true)
      setError(null)
      setStreaming('')
      abort.current = new AbortController()
      try {
        const text = await fn((t) => {
          setStreaming(t)
          scrollDown()
        }, abort.current.signal)
        setStreaming(null)
        await flush()
        scrollDown()
        void afterReply(text ?? undefined)
      } catch (e) {
        setStreaming(null)
        setError(describeError(e))
      } finally {
        setBusy(false)
      }
    },
    [afterReply, scrollDown],
  )

  // Opening message when the session is new.
  const started = useRef(false)
  useEffect(() => {
    if (!s || started.current || s.messages.length) return
    started.current = true
    void run((onText) => start(id, onText))
  }, [s, id, run])

  useEffect(scrollDown, [s?.messages.length, scrollDown])

  if (!s) return null

  async function submit(text: string) {
    const t = text.trim()
    if (!t || busy) return
    dictation.stop()
    stopSpeaking()
    setDraft('')
    await run((onText, signal) => send(id, t, { onText, signal }))
  }

  const retry = () => {
    const last = s.messages[s.messages.length - 1]
    if (last?.role === 'user') void run((onText, signal) => reply(id, { onText, signal }))
    else if (!s.messages.length) void run((onText) => start(id, onText))
  }

  const endSession = async () => {
    setEndSheet(false)
    dictation.stop()
    await run((onText) => close(id, remainingMinutes(s) > 1, onText))
  }

  const makeReport = async () => {
    setReporting(true)
    setError(null)
    try {
      await generateReport(id)
      await flush()
      nav.go({ name: 'review', id })
    } catch (e) {
      setError(describeError(e) + ' Rapor hazırlanamadı.')
    } finally {
      setReporting(false)
    }
  }

  const remaining = Math.max(0, Math.ceil(remainingMinutes(s)))
  const lastMsg = s.messages[s.messages.length - 1]
  const closed = s.status === 'closing' && lastMsg?.role === 'assistant' && !busy
  const timeUp = s.status === 'active' && remaining <= 0
  const visible = s.messages.filter((m) => !m.hidden)

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="glass pt-safe z-20 border-b border-line">
        <div className="mx-auto flex h-12 max-w-xl items-center gap-2 px-3">
          <button onClick={() => { dictation.stop(); stopSpeaking(); nav.back() }} aria-label="Geri" className="grid size-9 place-items-center rounded-full text-accent">
            <CaretLeft size={22} weight="bold" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] leading-tight font-[650]">Seans {s.no}</p>
            <p className="flex items-center gap-1 text-[12.5px] text-muted">
              <Timer size={13} weight="bold" />
              {s.status === 'active' ? `${remaining} dk kaldı` : 'Kapanış'}
            </p>
          </div>
          <EmergencyButton onClick={nav.openEmergency} />
        </div>
        <div className="mx-auto h-[3px] max-w-xl px-3">
          <div className="h-full overflow-hidden rounded-full">
            <div className="h-full rounded-full bg-accent transition-[width] duration-1000" style={{ width: `${Math.min(100, (s.activeMs / 60000 / 50) * 100)}%` }} />
          </div>
        </div>
      </header>

      <div ref={scroller} className="no-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-4 pt-5 pb-6">
          {visible.map((m) => (
            <Bubble key={m.id} role={m.role} text={m.text} onSpeak={canSpeak() ? () => void speak(m.text, speechRate, voiceURI) : undefined} />
          ))}
          {streaming !== null && (streaming ? <Bubble role="assistant" text={streaming} live /> : <Thinking />)}

          {error && (
            <div className="my-4 rounded-card bg-danger/10 p-4 text-[15px] text-danger">
              {error}
              {!reporting && (
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={closed ? makeReport : retry}>
                    Tekrar dene
                  </Button>
                </div>
              )}
            </div>
          )}

          {timeUp && !busy && (
            <div className="my-4 rounded-card bg-accent-soft p-4">
              <p className="text-[15.5px] font-[620] text-accent-deep">Süre doldu</p>
              <p className="mt-1 text-[14.5px] text-accent-deep/80">Son sözlerini söyleyebilir ya da seansı şimdi kapatabilirsin.</p>
              <Button size="sm" className="mt-3" onClick={endSession}>
                Seansı kapat
              </Button>
            </div>
          )}

          {closed && (
            <div className="my-5 rounded-card bg-surface p-5 shadow-card">
              <p className="text-[17px] font-[650]">Seans kapandı</p>
              <p className="mt-1 text-[14.5px] text-muted">
                Şimdi raporu, güncellenmiş dosyanı ve döngünü hazırlayayım. Kaydetmeden önce okuyup onaylayacaksın.
              </p>
              <p className="mt-2 text-[13px] text-muted">Bu seansın maliyeti şimdiye kadar: {fmtUsd(s.usage.usd)}</p>
              <Button size="lg" className="mt-4 w-full" disabled={reporting} onClick={makeReport}>
                {reporting ? 'Rapor hazırlanıyor…' : 'Raporu hazırla'}
              </Button>
              {reporting && <p className="mt-2 text-center text-[13px] text-muted">Bu bir dakika kadar sürebilir.</p>}
            </div>
          )}
        </div>
      </div>

      {s.status === 'active' && (
        <footer className="glass pb-safe z-20 border-t border-line">
          <div className="mx-auto max-w-xl px-3 pt-2.5">
            <div className="mb-2 flex items-center gap-2">
              <Chip on={readAloud} onClick={() => setSetting({ readAloud: !readAloud })} label="Sesli oku">
                {readAloud ? <SpeakerHigh size={15} weight="bold" /> : <SpeakerSlash size={15} weight="bold" />}
              </Chip>
              {dictation.supported && (
                <Chip on={handsFree} onClick={() => setSetting({ handsFree: !handsFree })} label="Eller serbest">
                  <Headphones size={15} weight="bold" />
                </Chip>
              )}
              <button onClick={() => setEndSheet(true)} className="ml-auto h-8 shrink-0 rounded-full px-3 text-[13.5px] whitespace-nowrap font-medium text-muted active:bg-surface-2">
                Seansı bitir
              </button>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex min-h-11 flex-1 items-end rounded-[22px] border border-line bg-surface px-3.5 py-2.5 focus-within:border-accent">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={1}
                  placeholder={dictation.listening ? 'Dinliyorum…' : 'Yaz ya da mikrofona dokun'}
                  aria-label="Mesajın"
                  className="no-scrollbar max-h-40 w-full resize-none bg-transparent text-[16px] leading-snug outline-none placeholder:text-muted [field-sizing:content]"
                />
              </div>
              <button
                onClick={() => {
                  if (!dictation.supported) {
                    inputRef.current?.focus()
                    setKbHint(true)
                  } else if (dictation.listening) dictation.stop()
                  else {
                    stopSpeaking()
                    dictation.start(draft)
                  }
                }}
                aria-label={dictation.listening ? 'Dinlemeyi durdur' : 'Konuşarak yaz'}
                className={cx(
                  'relative grid size-11 shrink-0 place-items-center rounded-full transition-colors active:scale-90',
                  dictation.listening ? 'bg-danger text-white' : 'bg-accent-soft text-accent',
                )}
              >
                {dictation.listening && <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-danger/35" />}
                {dictation.listening ? <Stop size={18} weight="fill" /> : <Microphone size={21} weight="bold" />}
              </button>
              <button
                onClick={() => void submit(draft)}
                disabled={!draft.trim() || busy}
                aria-label="Gönder"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-[transform,opacity] active:scale-90 disabled:opacity-35"
              >
                <ArrowUp size={20} weight="bold" />
              </button>
            </div>
            {dictation.error && <p className="mt-1.5 text-[12.5px] text-danger">{dictation.error}</p>}
            {!dictation.error && kbHint && !dictation.supported && <p className="mt-1.5 text-[12.5px] text-muted">{KEYBOARD_HINT}</p>}
          </div>
        </footer>
      )}

      <Sheet open={endSheet} onClose={() => setEndSheet(false)} title="Seansı bitir">
        <p className="text-[15.5px] leading-relaxed text-muted">
          {remaining > 0 ? `${remaining} dakika daha var. ` : ''}Bitirmek istemen gayet normal. Danışmanın kısa bir kapanış yapacak, sonra raporu
          hazırlayacağız.
        </p>
        <div className="mt-6 mb-2 space-y-2">
          <Button size="lg" className="w-full" onClick={endSession}>
            Kapanışa geç
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setEndSheet(false)}>
            Devam et
          </Button>
        </div>
      </Sheet>

      <AnimatePresence>
        {dictation.listening && handsFree && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-x-0 bottom-36 z-30 flex justify-center"
          >
            <span className="glass rounded-full border border-line px-4 py-2 text-[13.5px] text-muted shadow-card">
              Dinliyorum. Sustuğunda gönderilecek.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Bubble({ role, text, live, onSpeak }: { role: 'user' | 'assistant'; text: string; live?: boolean; onSpeak?: () => void }) {
  if (role === 'user')
    return (
      <div className="mb-4 flex justify-end">
        <div className="max-w-[85%] rounded-[22px] rounded-br-[8px] bg-accent px-4 py-2.5 text-[16px] leading-snug whitespace-pre-wrap text-accent-ink">
          {text}
        </div>
      </div>
    )
  return (
    <div className="group mb-5">
      <div
        className={cx('prose-seans prose-chat text-[16.5px]', live && 'after:ml-0.5 after:inline-block after:h-4 after:w-[2px] after:animate-pulse after:bg-accent after:align-middle after:content-[""]')}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
      {onSpeak && !live && (
        <button onClick={onSpeak} aria-label="Sesli oku" className="mt-1 -ml-1.5 grid size-8 place-items-center rounded-full text-muted active:bg-surface-2">
          <SpeakerHigh size={16} />
        </button>
      )}
    </div>
  )
}

function Thinking() {
  return (
    <div className="mb-5 flex h-6 items-center gap-1.5" aria-label="Danışman düşünüyor">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2 animate-pulse rounded-full bg-accent/60" style={{ animationDelay: `${i * 180}ms` }} />
      ))}
    </div>
  )
}

function Chip({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
        on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted',
      )}
    >
      {children}
      {label}
    </button>
  )
}
