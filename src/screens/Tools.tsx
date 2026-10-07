import {
  ArrowRight,
  CaretRight,
  ChatCircleText,
  CheckCircle,
  Compass,
  Flower,
  Heart,
  NotePencil,
  Pause,
  Play,
  Scales,
  Tree,
  Waves,
  Wind,
  type Icon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { TextField } from '../components/TextField'
import { Button, Field, Group, Row, Screen, cx } from '../components/ui'
import { locale, t, useLang, type Key } from '../lib/i18n'
import { update, useV } from '../lib/store'
import { TOOL_KINDS, featuredTools, toolSettings } from '../lib/tools'
import { uid, type BreathVariant, type ToolKind, type ToolSettings } from '../lib/types'
import { useNav } from '../nav'

export const TOOL_ICONS: Record<ToolKind, Icon> = {
  moment: NotePencil,
  beneath: Flower,
  compassion: Heart,
  breathe: Wind,
  grounding: Tree,
  reframe: Scales,
  values: Compass,
  express: ChatCircleText,
  urge: Waves,
}

export function useTool(kind: ToolKind): ToolSettings {
  const v = useV()
  const lang = useLang()
  return toolSettings(v.tools, kind, lang)
}

/** Opens a tool; the moment log is a sheet, the rest are screens. */
export function useOpenTool() {
  const nav = useNav()
  return (kind: ToolKind) => (kind === 'moment' ? nav.newEntry() : nav.go({ name: 'tool', kind }))
}

function saveEntry(kind: ToolKind, title: string, fields: { label: string; value: string }[]) {
  update((v) => ({
    ...v,
    toolEntries: [{ id: uid(), ts: Date.now(), kind, title, fields: fields.filter((f) => f.value.trim()) }, ...(v.toolEntries ?? [])],
  }))
}

function Why({ text }: { text?: string }) {
  if (!text) return null
  return (
    <div className="mb-5 rounded-card bg-accent-soft p-4">
      <p className="text-[12.5px] font-medium text-accent-deep/80">{t('whyTool')}</p>
      <p className="mt-1 text-[15px] leading-snug text-accent-deep">{text}</p>
    </div>
  )
}

function Saved({ onDone }: { onDone: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col items-center text-center">
      <CheckCircle size={40} weight="fill" className="text-accent" />
      <p className="mt-2 text-[16px] font-[620]">{t('savedToJournal')}</p>
      <Button variant="secondary" className="mt-4" onClick={onDone}>
        {t('finishTool')}
      </Button>
    </motion.div>
  )
}

export function ToolScreen({ kind }: { kind: ToolKind }) {
  switch (kind) {
    case 'beneath':
      return <Beneath />
    case 'compassion':
      return <Compassion />
    case 'breathe':
      return <Breathe />
    case 'grounding':
      return <Grounding />
    case 'reframe':
      return <Reframe />
    case 'values':
      return <Values />
    case 'express':
      return <Express />
    case 'urge':
      return <Urge />
    default:
      return <ToolsLibrary />
  }
}

// ---------------------------------------------------------------- Library

export function ToolsLibrary() {
  const v = useV()
  const nav = useNav()
  const lang = useLang()
  const open = useOpenTool()
  const featured = featuredTools(v.tools)
  const rest = TOOL_KINDS.filter((k) => !featured.includes(k))
  const row = (k: ToolKind) => {
    const s = toolSettings(v.tools, k, lang)
    const I = TOOL_ICONS[k]
    return <Row key={k} icon={<I size={18} weight="bold" />} title={s.title} sub={s.subtitle} onClick={() => open(k)} trailing={<CaretRight size={16} className="text-muted" />} />
  }
  return (
    <Screen title={t('toolsTitle')} onBack={nav.back}>
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">{t('toolsIntro')}</p>
      <Group title={t('toolsSuggested')}>{featured.map(row)}</Group>
      {rest.length > 0 && <Group title={t('toolsOther')}>{rest.map(row)}</Group>}
    </Screen>
  )
}

// ---------------------------------------------------------------- Breathing

const BREATHS: Record<BreathVariant, { title: Key; intro: Key; rounds: number; phases: { label: Key; sec: number; scale: number }[] }> = {
  '478': {
    title: 'breathe478',
    intro: 'breathe478Intro',
    rounds: 4,
    phases: [
      { label: 'breatheIn', sec: 4, scale: 1 },
      { label: 'breatheHold', sec: 7, scale: 1 },
      { label: 'breatheOut', sec: 8, scale: 0.55 },
    ],
  },
  box: {
    title: 'breatheBox',
    intro: 'breatheBoxIntro',
    rounds: 4,
    phases: [
      { label: 'breatheIn', sec: 4, scale: 1 },
      { label: 'breatheHold', sec: 4, scale: 1 },
      { label: 'breatheOut', sec: 4, scale: 0.55 },
      { label: 'breatheHold', sec: 4, scale: 0.55 },
    ],
  },
  sigh: {
    title: 'breatheSigh',
    intro: 'breatheSighIntro',
    rounds: 5,
    phases: [
      { label: 'breatheIn', sec: 2, scale: 0.85 },
      { label: 'breatheTopUp', sec: 1, scale: 1 },
      { label: 'breatheLongOut', sec: 6, scale: 0.55 },
    ],
  },
  coherent: {
    title: 'breatheCoherent',
    intro: 'breatheCoherentIntro',
    rounds: 12,
    phases: [
      { label: 'breatheIn', sec: 5, scale: 1 },
      { label: 'breatheOut', sec: 5, scale: 0.55 },
    ],
  },
}

export function Breathe() {
  const nav = useNav()
  const s = useTool('breathe')
  const B = BREATHS[s.variant ?? '478']
  const reduce = useReducedMotion()
  const [running, setRunning] = useState(false)
  const [{ phase, left, round }, setT] = useState({ phase: 0, left: B.phases[0].sec, round: 1 })
  const done = round > B.rounds

  useEffect(() => {
    if (!running || done) return
    const id = setInterval(() => {
      setT((x) => {
        if (x.left > 1) return { ...x, left: x.left - 1 }
        const next = (x.phase + 1) % B.phases.length
        return { phase: next, left: B.phases[next].sec, round: next === 0 ? x.round + 1 : x.round }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, done, B])

  useEffect(() => {
    if (running) navigator.vibrate?.(15)
  }, [phase, running])

  const reset = () => {
    setT({ phase: 0, left: B.phases[0].sec, round: 1 })
    setRunning(true)
  }

  const p = B.phases[phase]
  const scale = !running ? 0.55 : p.scale

  return (
    <Screen title={s.title} onBack={nav.back}>
      <Why text={s.why} />
      <p className="-mt-2 text-[15px] leading-snug text-muted">
        <span className="font-medium text-ink">{t(B.title)}.</span> {t(B.intro)}
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
                  key={running ? `${phase}` : 'ready'}
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
      <p className="mb-5 text-center text-[14px] text-muted">{done ? t('roundsDone', { n: B.rounds }) : t('round', { n: round, m: B.rounds })}</p>
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

// ---------------------------------------------------------------- Self-compassion

const COMPASSION: { title: Key; text: Key }[] = [
  { title: 'c1Title', text: 'c1Text' },
  { title: 'c2Title', text: 'c2Text' },
  { title: 'c3Title', text: 'c3Text' },
]

export function Compassion() {
  const nav = useNav()
  const s = useTool('compassion')
  const [i, setI] = useState(0)
  const step = COMPASSION[i]
  const last = i === COMPASSION.length - 1
  return (
    <Screen title={s.title} onBack={nav.back}>
      <Why text={s.why} />
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">{t('compassionIntro')}</p>
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
          {last && s.kindPhrase && (
            <div className="mt-4 rounded-[14px] bg-accent-soft p-3.5">
              <p className="text-[12.5px] font-medium text-accent-deep/80">{t('kindPhraseLabel')}</p>
              <p className="mt-1 text-[16px] leading-snug text-accent-deep">{s.kindPhrase}</p>
            </div>
          )}
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

// ---------------------------------------------------------------- Beneath the feeling

export function Beneath() {
  const nav = useNav()
  const s = useTool('beneath')
  const [picked, setPicked] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const options = s.options ?? []
  const save = () => {
    saveEntry('beneath', s.title, [
      { label: s.surface ?? '', value: picked.join(', ') },
    ])
    setSaved(true)
  }
  return (
    <Screen title={s.title} onBack={nav.back}>
      <Why text={s.why} />
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">{t('beneathIntro', { surface: s.surface ?? '' })}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((u) => {
          const on = picked.includes(u.name)
          return (
            <button
              key={u.name}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== u.name) : [...p, u.name]))}
              aria-pressed={on}
              className={cx('rounded-card p-4 text-left shadow-card transition-colors active:scale-[0.97]', on ? 'bg-accent text-accent-ink' : 'bg-surface')}
            >
              <span className="block text-[16px] font-[620]">{u.name}</span>
              <span className={cx('mt-1 block text-[13.5px] leading-snug', on ? 'text-accent-ink/80' : 'text-muted')}>{u.q}</span>
            </button>
          )
        })}
      </div>
      {picked.length > 0 && !saved && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-card bg-accent-soft p-5">
          <p className="text-[16px] leading-relaxed text-accent-deep">
            {t('beneathResult', { list: picked.join(', ').toLocaleLowerCase(locale()), first: picked[0].toLocaleLowerCase(locale()) })}
          </p>
          <Button className="mt-4" onClick={save}>
            {t('saveToJournal')}
          </Button>
        </motion.div>
      )}
      {saved && <Saved onDone={nav.back} />}
    </Screen>
  )
}

// ---------------------------------------------------------------- Grounding

const SENSES: { key: Key; count: number }[] = [
  { key: 'g5', count: 5 },
  { key: 'g4', count: 4 },
  { key: 'g3', count: 3 },
  { key: 'g2', count: 2 },
  { key: 'g1', count: 1 },
]

export function Grounding() {
  const nav = useNav()
  const s = useTool('grounding')
  const [step, setStep] = useState(0)
  const [found, setFound] = useState(0)
  const done = step >= SENSES.length
  const cur = SENSES[Math.min(step, SENSES.length - 1)]
  const tap = () => {
    navigator.vibrate?.(10)
    if (found + 1 >= cur.count) {
      setStep((x) => x + 1)
      setFound(0)
    } else setFound((f) => f + 1)
  }
  return (
    <Screen title={s.title} onBack={nav.back}>
      <Why text={s.why} />
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">{t('groundingIntro')}</p>
      <div className="mb-6 flex gap-1.5">
        {SENSES.map((_, k) => (
          <span key={k} className={cx('h-1.5 flex-1 rounded-full transition-colors', k < step ? 'bg-accent' : 'bg-surface-2')} />
        ))}
      </div>
      {done ? (
        <div className="rounded-card bg-accent-soft p-6 text-center">
          <p className="text-[19px] leading-snug font-[620] text-accent-deep">{t('groundingDone')}</p>
          <Button className="mt-5" onClick={nav.back}>
            {t('finishTool')}
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <p className="text-center text-[24px] font-[650] tracking-[-0.02em]">{t(cur.key)}</p>
            <button
              onClick={tap}
              className="mx-auto mt-8 grid size-48 place-items-center rounded-full bg-surface shadow-card transition-transform active:scale-95"
              aria-label={t(cur.key)}
            >
              <span className="font-mono text-[56px] font-medium tabular-nums text-accent">{cur.count - found}</span>
            </button>
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: cur.count }, (_, k) => (
                <span key={k} className={cx('size-3 rounded-full', k < found ? 'bg-accent' : 'bg-surface-2 ring-1 ring-line')} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </Screen>
  )
}

// ---------------------------------------------------------------- Thought check

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 w-full accent-[var(--accent)]" />
    </Field>
  )
}

export function Reframe() {
  const nav = useNav()
  const s = useTool('reframe')
  const [f, setF] = useState({ situation: '', thought: '', belief: 70, forE: '', against: '', balanced: '', after: 40 })
  const [saved, setSaved] = useState(false)
  const set = (k: keyof typeof f) => (v: string | number) => setF((x) => ({ ...x, [k]: v }))
  const save = () => {
    saveEntry('reframe', s.title, [
      { label: t('rfSituation'), value: f.situation },
      { label: t('rfThought'), value: `${f.thought} (${f.belief}%)` },
      { label: t('rfFor'), value: f.forE },
      { label: t('rfAgainst'), value: f.against },
      { label: t('rfBalanced'), value: f.balanced },
      { label: t('rfBeliefAfter', { n: f.after }), value: `${f.after}%` },
    ])
    setSaved(true)
  }
  if (saved)
    return (
      <Screen title={s.title} onBack={nav.back}>
        <Saved onDone={nav.back} />
      </Screen>
    )
  return (
    <Screen title={s.title} onBack={nav.back}>
      <Why text={s.why} />
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">{t('reframeIntro')}</p>
      <TextField label={t('rfSituation')} value={f.situation} onChange={set('situation')} />
      <TextField label={t('rfThought')} value={f.thought} onChange={set('thought')} />
      <Slider label={t('rfBelief', { n: f.belief })} value={f.belief} onChange={set('belief')} />
      <TextField label={t('rfFor')} value={f.forE} onChange={set('forE')} />
      <TextField label={t('rfAgainst')} value={f.against} onChange={set('against')} />
      <TextField label={t('rfBalanced')} value={f.balanced} onChange={set('balanced')} />
      <Slider label={t('rfBeliefAfter', { n: f.after })} value={f.after} onChange={set('after')} />
      <Button size="lg" className="mt-2 w-full" disabled={!f.thought.trim()} onClick={save}>
        {t('saveToJournal')}
      </Button>
    </Screen>
  )
}

// ---------------------------------------------------------------- Values

export function Values() {
  const nav = useNav()
  const s = useTool('values')
  const [picked, setPicked] = useState<string[]>([])
  const [action, setAction] = useState('')
  const [saved, setSaved] = useState(false)
  const toggle = (x: string) => setPicked((p) => (p.includes(x) ? p.filter((y) => y !== x) : p.length < 3 ? [...p, x] : p))
  const save = () => {
    saveEntry('values', s.title, [
      { label: t('valuesChosen'), value: picked.join(', ') },
      { label: t('valuesAction'), value: action },
    ])
    setSaved(true)
  }
  if (saved)
    return (
      <Screen title={s.title} onBack={nav.back}>
        <Saved onDone={nav.back} />
      </Screen>
    )
  return (
    <Screen title={s.title} onBack={nav.back}>
      <Why text={s.why} />
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">{t('valuesIntro')}</p>
      <Field label={t('valuesPick')} group>
        <div className="flex flex-wrap gap-2">
          {(s.values ?? []).map((x) => (
            <button
              key={x}
              onClick={() => toggle(x)}
              aria-pressed={picked.includes(x)}
              className={cx('h-10 rounded-full px-4 text-[15px] font-medium transition-colors', picked.includes(x) ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink')}
            >
              {x}
            </button>
          ))}
        </div>
      </Field>
      <TextField label={t('valuesAction')} hint={t('valuesActionHint')} value={action} onChange={setAction} />
      <Button size="lg" className="mt-2 w-full" disabled={!picked.length || !action.trim()} onClick={save}>
        {t('saveToJournal')}
      </Button>
    </Screen>
  )
}

// ---------------------------------------------------------------- Express (DEAR MAN)

export function Express() {
  const nav = useNav()
  const s = useTool('express')
  const [f, setF] = useState({ describe: '', express: '', ask: '', reinforce: '' })
  const [saved, setSaved] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const script = [f.describe, f.express, f.ask, f.reinforce].map((x) => x.trim()).filter(Boolean).join(' ')
  const save = () => {
    saveEntry('express', s.title, [
      { label: t('exDescribe'), value: f.describe },
      { label: t('exExpress'), value: f.express },
      { label: t('exAsk'), value: f.ask },
      { label: t('exReinforce'), value: f.reinforce },
    ])
    setSaved(true)
  }
  if (saved)
    return (
      <Screen title={s.title} onBack={nav.back}>
        <Saved onDone={nav.back} />
      </Screen>
    )
  return (
    <Screen title={s.title} onBack={nav.back}>
      <Why text={s.why} />
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">{t('expressIntro')}</p>
      <TextField label={t('exDescribe')} hint={t('exDescribeHint')} value={f.describe} onChange={set('describe')} />
      <TextField label={t('exExpress')} hint={t('exExpressHint')} value={f.express} onChange={set('express')} />
      <TextField label={t('exAsk')} hint={t('exAskHint')} value={f.ask} onChange={set('ask')} />
      <TextField label={t('exReinforce')} hint={t('exReinforceHint')} value={f.reinforce} onChange={set('reinforce')} />
      {script && (
        <div className="mb-4 rounded-card bg-accent-soft p-4">
          <p className="text-[12.5px] font-medium text-accent-deep/80">{t('exPreview')}</p>
          <p className="mt-1 text-[16px] leading-relaxed text-accent-deep">{script}</p>
        </div>
      )}
      <Button size="lg" className="w-full" disabled={!f.ask.trim()} onClick={save}>
        {t('saveToJournal')}
      </Button>
    </Screen>
  )
}

// ---------------------------------------------------------------- Urge surfing

export function Urge() {
  const nav = useNav()
  const s = useTool('urge')
  const reduce = useReducedMotion()
  const total = (s.minutes ?? 3) * 60
  const [stage, setStage] = useState<'before' | 'riding' | 'after' | 'saved'>('before')
  const [before, setBefore] = useState(7)
  const [after, setAfter] = useState(4)
  const [left, setLeft] = useState(total)

  useEffect(() => {
    if (stage !== 'riding') return
    const id = setInterval(() => setLeft((l) => (l > 1 ? l - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [stage])

  useEffect(() => {
    if (stage === 'riding' && left === 0) {
      navigator.vibrate?.([20, 60, 20])
      setStage('after')
    }
  }, [left, stage])

  const phaseKey: Key = (['urge1', 'urge2', 'urge3', 'urge4'] as const)[Math.min(3, Math.floor(((total - left) / total) * 4))]

  const save = () => {
    saveEntry('urge', s.title, [
      { label: s.urgeName ?? '', value: `${t('urgeLabelBefore')} ${before}/10, ${t('urgeLabelAfter')} ${after}/10` },
    ])
    setStage('saved')
  }

  let body: ReactNode
  if (stage === 'before')
    body = (
      <>
        <Field label={t('urgeBefore', { name: s.urgeName ?? '', n: before })}>
          <input type="range" min={0} max={10} value={before} onChange={(e) => setBefore(Number(e.target.value))} className="h-8 w-full accent-[var(--accent)]" />
        </Field>
        <Button size="lg" className="mt-2 w-full" onClick={() => setStage('riding')}>
          <Waves size={18} weight="bold" /> {t('urgeStart')}
        </Button>
      </>
    )
  else if (stage === 'riding')
    body = (
      <div className="flex flex-col items-center">
        <div className="relative my-6 grid size-56 place-items-center">
          <motion.div
            className="absolute inset-0 rounded-full bg-accent/15"
            animate={reduce ? {} : { scale: [0.75, 1, 0.75] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="relative font-mono text-[40px] font-medium tabular-nums text-accent-deep">{t('urgeLeft', { n: left })}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={phaseKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-[56px] max-w-[30ch] text-center text-[18px] leading-snug">
            {t(phaseKey)}
          </motion.p>
        </AnimatePresence>
        <Button variant="secondary" className="mt-6" onClick={() => setStage('after')}>
          {t('finishTool')}
        </Button>
      </div>
    )
  else if (stage === 'after')
    body = (
      <>
        <Field label={t('urgeAfter', { n: after })}>
          <input type="range" min={0} max={10} value={after} onChange={(e) => setAfter(Number(e.target.value))} className="h-8 w-full accent-[var(--accent)]" />
        </Field>
        <Button size="lg" className="mt-2 w-full" onClick={save}>
          {t('saveToJournal')}
        </Button>
      </>
    )
  else body = <Saved onDone={nav.back} />

  return (
    <Screen title={s.title} onBack={nav.back}>
      <Why text={s.why} />
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">{t('urgeIntro')}</p>
      {body}
    </Screen>
  )
}
