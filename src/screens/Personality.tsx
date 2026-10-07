import { ArrowLeft, Sparkle, UserCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { TextField } from '../components/TextField'
import { Button, Screen, cx } from '../components/ui'
import { describeError } from '../lib/claude'
import { getLang, t, useLang, type Key } from '../lib/i18n'
import { CONCERNS, ITEMS, TRAITS, TRAIT_TEXT, archetype, level, score } from '../lib/personality'
import { update, useV } from '../lib/store'
import type { Profile } from '../lib/types'
import { useNav } from '../nav'
import { personalize } from './sessionLogic'

type Stage = 'intro' | 'test' | 'concerns' | 'result'

const SCALE: { value: number; label: Key; size: number }[] = [
  { value: 1, label: 'pt1', size: 46 },
  { value: 2, label: 'pt2', size: 36 },
  { value: 3, label: 'pt3', size: 28 },
  { value: 4, label: 'pt4', size: 36 },
  { value: 5, label: 'pt5', size: 46 },
]

export function Personality({ first }: { first?: boolean }) {
  const v = useV()
  const nav = useNav()
  const lang = useLang()
  const [stage, setStage] = useState<Stage>(v.profile && !first ? 'result' : 'intro')
  const [answers, setAnswers] = useState<number[]>([])
  const [i, setI] = useState(0)
  const [concerns, setConcerns] = useState<string[]>(v.profile?.concerns ?? [])
  const [note, setNote] = useState(v.profile?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const leave = () => (first ? nav.tab('home') : nav.back())

  const skip = () => {
    update((x) => ({ ...x, profileSkipped: true }))
    leave()
  }

  const answer = (value: number) => {
    const next = [...answers]
    next[i] = value
    setAnswers(next)
    navigator.vibrate?.(8)
    setTimeout(() => (i + 1 < ITEMS.length ? setI(i + 1) : setStage('concerns')), 220)
  }

  const finish = () => {
    const profile: Profile = { scores: score(answers), takenAt: Date.now(), concerns, note: note.trim() }
    update((x) => ({ ...x, profile, profileSkipped: false }))
    setStage('result')
  }

  const prepare = async () => {
    setBusy(true)
    setError(null)
    try {
      await personalize()
      leave()
    } catch (e) {
      setError(e instanceof Error && e.message === t('personalizeFailed') ? e.message : describeError(e))
    } finally {
      setBusy(false)
    }
  }

  if (stage === 'intro')
    return (
      <Screen title={t('ptIntroTitle')} onBack={first ? undefined : nav.back} bottomPad={false}>
        <div className="mb-6 grid size-16 place-items-center rounded-[20px] bg-accent text-accent-ink">
          <UserCircle size={32} weight="duotone" />
        </div>
        <p className="text-[16.5px] leading-relaxed text-muted">{t('ptIntroText')}</p>
        <p className="mt-5 rounded-card bg-surface p-4 text-[13.5px] leading-relaxed text-muted shadow-card">{t('ptNote')}</p>
        <div className="mt-8 space-y-2 pb-10">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setAnswers([])
              setI(0)
              setStage('test')
            }}
          >
            {t('ptStart')}
          </Button>
          {first && (
            <Button size="lg" variant="ghost" className="w-full" onClick={skip}>
              {t('ptSkip')}
            </Button>
          )}
        </div>
      </Screen>
    )

  if (stage === 'test') {
    const item = ITEMS[i]
    return (
      <div className="pt-safe pb-safe mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5">
        <div className="flex h-12 items-center justify-between">
          <button
            onClick={() => (i > 0 ? setI(i - 1) : setStage('intro'))}
            className="flex items-center gap-1 rounded-full py-2 pr-3 text-[15px] text-accent"
          >
            <ArrowLeft size={18} weight="bold" /> {t('ptPrev')}
          </button>
          <span className="text-[13.5px] text-muted tabular-nums">{t('ptQ', { n: i + 1, m: ITEMS.length })}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${(i / ITEMS.length) * 100}%` }} />
        </div>
        <div className="flex flex-1 flex-col justify-center pb-16">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="text-center text-[26px] leading-snug font-[650] tracking-[-0.02em] text-balance"
            >
              {item.text[lang]}
            </motion.p>
          </AnimatePresence>
          <div className="mt-12 flex items-center justify-between gap-2 px-1" role="radiogroup" aria-label={item.text[lang]}>
            {SCALE.map((sc) => {
              const on = answers[i] === sc.value
              const agree = sc.value > 3
              const disagree = sc.value < 3
              return (
                <button
                  key={sc.value}
                  role="radio"
                  aria-checked={on}
                  aria-label={t(sc.label)}
                  onClick={() => answer(sc.value)}
                  className="grid size-14 place-items-center"
                >
                  <span
                    style={{ width: sc.size, height: sc.size }}
                    className={cx(
                      'block rounded-full border-[2.5px] transition-colors duration-150',
                      agree && (on ? 'border-accent bg-accent' : 'border-accent'),
                      disagree && (on ? 'border-muted bg-muted' : 'border-muted'),
                      !agree && !disagree && (on ? 'border-line bg-surface-2' : 'border-line'),
                    )}
                  />
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between px-1 text-[13.5px] font-medium">
            <span className="text-muted">{t('ptDisagree')}</span>
            <span className="text-accent">{t('ptAgree')}</span>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'concerns') {
    const list = CONCERNS[lang]
    return (
      <Screen title={t('ptConcernsTitle')} onBack={() => setStage('test')}>
        <p className="-mt-3 mb-5 text-[15px] text-muted">{t('ptConcernsSub')}</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {list.map((c) => {
            const on = concerns.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => setConcerns((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))}
                aria-pressed={on}
                className={cx('h-10 rounded-full px-4 text-[15px] font-medium transition-colors', on ? 'bg-accent text-accent-ink' : 'bg-surface text-ink shadow-card')}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        <TextField label={t('ptNoteLabel')} hint={t('ptNoteHint')} value={note} onChange={setNote} />
        <Button size="lg" className="mt-2 w-full" onClick={finish}>
          {t('ptSeeResult')}
        </Button>
      </Screen>
    )
  }

  // Result
  const p = v.profile
  if (!p) return null
  const T = TRAIT_TEXT[getLang()]
  return (
    <Screen title={t('ptResultTitle')} onBack={first ? undefined : nav.back}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 overflow-hidden rounded-card p-6 text-white shadow-card"
        style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgb(140 205 186 / 0.55), transparent 60%), linear-gradient(160deg, #2f7264 0%, #1b463d 100%)' }}
      >
        <p className="text-[13.5px] text-white/75">{t('ptArchetypeSub')}</p>
        <p className="mt-1 text-[30px] leading-tight font-[680] tracking-[-0.02em]">{archetype(p.scores, lang)}</p>
      </motion.div>

      <div className="space-y-3">
        {TRAITS.map((k, idx) => {
          const val = p.scores[k]
          const high = val >= 50
          const tt = T[k]
          return (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              className="rounded-card bg-surface p-4 shadow-card"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-[16px] font-[620]">{tt.name}</p>
                <p className="text-[14px] font-semibold text-accent tabular-nums">
                  {lang === 'tr' ? `%${high ? val : 100 - val}` : `${high ? val : 100 - val}%`} {high ? tt.high : tt.low}
                </p>
              </div>
              <div className="relative mt-3 h-2 rounded-full bg-surface-2">
                <motion.span
                  className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-surface bg-accent shadow"
                  initial={{ left: '50%' }}
                  animate={{ left: `calc(${val}% - 8px)` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 + 0.05 * idx }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[12.5px] text-muted">
                <span>{tt.low}</span>
                <span>{tt.high}</span>
              </div>
              <p className="mt-2 text-[14.5px] leading-snug text-muted">{tt.desc[level(val)]}</p>
            </motion.div>
          )
        })}
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-muted">{t('ptNote')}</p>
      {error && <p className="mt-3 text-[14px] text-danger">{error}</p>}
      <div className="mt-6 space-y-2">
        {v.apiKey ? (
          <Button size="lg" className="w-full" disabled={busy} onClick={prepare}>
            <Sparkle size={18} weight="fill" /> {busy ? t('personalizing') : t('ptPrepare')}
          </Button>
        ) : (
          <p className="text-center text-[14px] text-muted">{t('ptNoKey')}</p>
        )}
        <Button size="lg" variant="secondary" className="w-full" onClick={leave}>
          {t('ptContinue')}
        </Button>
        {!first && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setAnswers([])
              setI(0)
              setStage('test')
            }}
          >
            {t('ptRetake')}
          </Button>
        )}
      </div>
    </Screen>
  )
}
