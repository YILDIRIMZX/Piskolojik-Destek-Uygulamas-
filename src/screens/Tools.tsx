import { ArrowRight, Pause, Play } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button, Screen, cx } from '../components/ui'
import { useNav } from '../nav'
import { UNDER, getLang, locale, t, type Key } from '../lib/i18n'

const PHASES = [
  { label: 'breatheIn', sec: 4, scale: 1 },
  { label: 'breatheHold', sec: 7, scale: 1 },
  { label: 'breatheOut', sec: 8, scale: 0.55 },
] as const satisfies readonly { label: Key; sec: number; scale: number }[]

const ROUNDS = 4

export function Breathe() {
  const nav = useNav()
  const reduce = useReducedMotion()
  const [running, setRunning] = useState(false)
  const [{ phase, left, round }, setT] = useState({ phase: 0, left: PHASES[0].sec as number, round: 1 })
  const done = round > ROUNDS

  useEffect(() => {
    if (!running || done) return
    const t = setInterval(() => {
      setT((s) => {
        if (s.left > 1) return { ...s, left: s.left - 1 }
        const next = (s.phase + 1) % PHASES.length
        return { phase: next, left: PHASES[next].sec, round: next === 0 ? s.round + 1 : s.round }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running, done])

  useEffect(() => {
    if (running) navigator.vibrate?.(15)
  }, [phase, running])

  const reset = () => {
    setT({ phase: 0, left: PHASES[0].sec, round: 1 })
    setRunning(true)
  }

  const p = PHASES[phase]
  const scale = !running ? 0.55 : p.scale

  return (
    <Screen title={t('breatheTitle')} onBack={nav.back}>
      <p className="-mt-2 text-[15px] leading-snug text-muted">
        {t('breatheIntro')}
      </p>
      <div className="relative mx-auto my-10 grid aspect-square w-full max-w-[300px] place-items-center">
        <div className="absolute inset-0 rounded-full border border-accent/20" />
        <motion.div
          className="absolute inset-[6%] rounded-full"
          style={{ background: 'radial-gradient(circle at 35% 30%, var(--accent-soft), var(--accent) 140%)' }}
          animate={{ scale: reduce ? 1 : scale }}
          transition={{ duration: running ? p.sec : 0.6, ease: [0.37, 0, 0.63, 1] }}
        />
        <div className="relative text-center">
          {done ? (
            <p className="text-[22px] font-[650] text-accent-deep">{t('completed')}</p>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.p
                  key={running ? p.label : 'ready'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-[22px] font-[650] text-accent-deep"
                >
                  {running ? t(p.label) : t('ready')}
                </motion.p>
              </AnimatePresence>
              {running && <p className="mt-1 font-mono text-[40px] leading-none font-medium tabular-nums text-accent-deep">{left}</p>}
            </>
          )}
        </div>
      </div>
      <p className="mb-5 text-center text-[14px] text-muted">{done ? t('roundsDone', { n: ROUNDS }) : t('round', { n: round, m: ROUNDS })}</p>
      {done ? (
        <Button size="lg" className="w-full" onClick={reset}>
          {t('again')}
        </Button>
      ) : (
        <Button size="lg" className="w-full" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
          {running ? t('pause') : t('start')}
        </Button>
      )}
    </Screen>
  )
}

const COMPASSION: { title: Key; text: Key }[] = [
  { title: 'c1Title', text: 'c1Text' },
  { title: 'c2Title', text: 'c2Text' },
  { title: 'c3Title', text: 'c3Text' },
]

export function Compassion() {
  const nav = useNav()
  const [i, setI] = useState(0)
  const step = COMPASSION[i]
  const last = i === COMPASSION.length - 1
  return (
    <Screen title={t('compassionTitle')} onBack={nav.back}>
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">
        {t('compassionIntro')}
      </p>
      <div className="mb-5 flex gap-1.5">
        {COMPASSION.map((_, k) => (
          <span key={k} className={cx('h-1.5 flex-1 rounded-full transition-colors', k <= i ? 'bg-accent' : 'bg-surface-2')} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[220px] rounded-card bg-surface p-6 shadow-card"
        >
          <p className="text-[24px] leading-tight font-[650] tracking-[-0.02em]">{t(step.title)}</p>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">{t(step.text)}</p>
        </motion.div>
      </AnimatePresence>
      <div className="mt-6 flex gap-2">
        {i > 0 && (
          <Button variant="secondary" size="lg" onClick={() => setI(i - 1)}>
            {t('back')}
          </Button>
        )}
        <Button size="lg" className="flex-1" onClick={() => (last ? nav.back() : setI(i + 1))}>
          {last ? t('finishTool') : t('next')} {!last && <ArrowRight size={18} weight="bold" />}
        </Button>
      </div>
    </Screen>
  )
}


export function Underneath() {
  const nav = useNav()
  const [picked, setPicked] = useState<string[]>([])
  return (
    <Screen title={t('underTitle')} onBack={nav.back}>
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">
        {t('underIntro')}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {UNDER[getLang()].map((u) => {
          const on = picked.includes(u.name)
          return (
            <button
              key={u.name}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== u.name) : [...p, u.name]))}
              aria-pressed={on}
              className={cx(
                'rounded-card p-4 text-left shadow-card transition-colors active:scale-[0.97]',
                on ? 'bg-accent text-accent-ink' : 'bg-surface',
              )}
            >
              <span className="block text-[16px] font-[620]">{u.name}</span>
              <span className={cx('mt-1 block text-[13.5px] leading-snug', on ? 'text-accent-ink/80' : 'text-muted')}>{u.q}</span>
            </button>
          )
        })}
      </div>
      {picked.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-card bg-accent-soft p-5">
          <p className="text-[16px] leading-relaxed text-accent-deep">
            {t('underResult', {
              list: picked.join(', ').toLocaleLowerCase(locale()),
              first: picked[0].toLocaleLowerCase(locale()),
            })}
          </p>
          <Button className="mt-4" onClick={nav.newEntry}>
            {t('writeJournal')}
          </Button>
        </motion.div>
      )}
    </Screen>
  )
}
