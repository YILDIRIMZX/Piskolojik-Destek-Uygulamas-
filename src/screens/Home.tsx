import { ArrowRight, ArrowsClockwise, CaretRight, GearSix, Sparkle, SquaresFour } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { EmergencyButton } from '../components/Emergency'
import { Button, Group, IconButton, Row, cx } from '../components/ui'
import { describeError } from '../lib/claude'
import { featuredTools, toolSettings } from '../lib/tools'
import { useNav } from '../nav'
import { useV } from '../lib/store'
import type { Vault } from '../lib/types'
import { SESSION_MINUTES, nextSessionNo, personalize, remainingMinutes } from './sessionLogic'
import { TOOL_ICONS, useOpenTool } from './Tools'
import { locale, t, useLang } from '../lib/i18n'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return t('goodNight')
  if (h < 12) return t('goodMorning')
  if (h < 18) return t('goodDay')
  return t('goodEvening')
}

/** The "next session" plan from the client file (or the last report), as plain text. */
export function nextPlan(v: Vault): string | null {
  const sources = [v.clientFile, v.reports[0]?.markdown ?? '']
  for (const src of sources) {
    const m = src.match(/^##+\s*(?:\d+\.\s*)?(?:Bir sonraki seans|(?:Plan for the )?Next session|Starting Point for the Next Session)[^\n]*\n([\s\S]*?)(?=\n##?\s|$)/im)
    if (m) {
      const text = m[1].replace(/[*_#>`]/g, '').replace(/^\s*\d+\.\s*/gm, '').replace(/\s+/g, ' ').trim()
      if (text) return text
    }
  }
  return null
}

export function Home() {
  const v = useV()
  const nav = useNav()
  const reduce = useReducedMotion()
  const active = v.sessions.find((s) => s.status === 'active' || s.status === 'closing')
  const review = v.sessions.find((s) => s.status === 'review')
  const plan = nextPlan(v)
  const lang = useLang()
  const openTool = useOpenTool()
  const weekAgo = Date.now() - 7 * 864e5
  const weekEntries = v.journal.filter((e) => e.ts > weekAgo).length
  const featured = featuredTools(v.tools)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canPersonalize = !!v.apiKey && !v.tools && (!!v.clientFile.trim() || !!v.profile)

  const runPersonalize = async () => {
    setBusy(true)
    setError(null)
    try {
      await personalize()
    } catch (e) {
      setError(e instanceof Error && e.message === t('personalizeFailed') ? e.message : describeError(e))
    } finally {
      setBusy(false)
    }
  }

  const hero = review
    ? { label: t('reportReady', { n: review.no }), sub: t('reportReadySub'), cta: t('openReport'), go: () => nav.go({ name: 'review', id: review.id }) }
    : active
      ? {
          label: t('sessionInProgress', { n: active.no }),
          sub: t('minutesLeft', { n: Math.ceil(remainingMinutes(active)) }),
          cta: t('continue'),
          go: () => nav.go({ name: 'session', id: active.id }),
        }
      : {
          label: t('sessionN', { n: nextSessionNo(v) }),
          sub: plan ?? t('sessionDefaultSub', { n: SESSION_MINUTES }),
          cta: t('startSession'),
          go: () => nav.tab('sessions'),
        }

  const item = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.04 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
        }

  return (
    <div className="pt-safe mx-auto max-w-xl px-4 pb-32">
      <header className="pt-2 pb-6">
        <div className="flex items-center justify-between">
          <p className="text-[14px] text-muted">{new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <div className="flex items-center gap-2">
            <EmergencyButton onClick={nav.openEmergency} />
            <IconButton label={t('settings')} onClick={() => nav.go({ name: 'settings' })}>
              <GearSix size={20} />
            </IconButton>
          </div>
        </div>
        <h1 className="mt-1 text-[32px] leading-tight font-[680] tracking-[-0.03em]">{greeting()}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          {...item(0)}
          onClick={hero.go}
          className="relative col-span-2 overflow-hidden rounded-card p-5 text-left text-white shadow-card active:scale-[0.985]"
          style={{
            background:
              'radial-gradient(120% 90% at 100% 0%, rgb(140 205 186 / 0.55), transparent 60%), linear-gradient(160deg, #2f7264 0%, #1b463d 100%)',
          }}
        >
          <p className="text-[24px] leading-tight font-[650] tracking-[-0.02em]">{hero.label}</p>
          <p className="mt-2 line-clamp-3 max-w-[36ch] text-[15px] leading-snug text-white/80">{hero.sub}</p>
          <span className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-[#1b463d]">
            {hero.cta} <ArrowRight size={16} weight="bold" />
          </span>
        </motion.button>

        {featured.map((kind, i) => {
          const ts = toolSettings(v.tools, kind, lang)
          const I = TOOL_ICONS[kind]
          // Bento: with an odd count the first tile spans the full width so the rest pair up without gaps.
          const wide = featured.length % 2 === 1 && i === 0
          return (
            <Tile
              key={kind}
              motionProps={item(i + 1)}
              className={cx(wide && 'col-span-2', i === 0 && 'bg-accent-soft')}
              wide={wide}
              tone={i === 0 ? 'accent' : undefined}
              onClick={() => openTool(kind)}
              icon={<I size={22} weight="bold" />}
              title={ts.title}
              text={ts.subtitle}
              foot={kind === 'moment' ? (weekEntries ? t('weekEntries', { n: weekEntries }) : t('weekNoEntries')) : undefined}
              decor={kind === 'breathe' && i !== 0 ? <BreathDecor /> : undefined}
            />
          )
        })}
      </div>

      {canPersonalize && (
        <div className="mt-5 rounded-card bg-surface p-5 shadow-card">
          <p className="flex items-center gap-2 text-[17px] font-[650]">
            <Sparkle size={20} weight="fill" className="text-accent" />
            {t('personalizeTitle')}
          </p>
          <p className="mt-1 text-[14.5px] leading-snug text-muted">{t('personalizeText')}</p>
          {error && <p className="mt-2 text-[14px] text-danger">{error}</p>}
          <Button className="mt-4" disabled={busy} onClick={runPersonalize}>
            {busy ? t('personalizing') : t('personalizeBtn')}
          </Button>
        </div>
      )}

      <div className="mt-5">
        <Group>
          <Row
            icon={<SquaresFour size={18} weight="bold" />}
            title={t('toolsAll')}
            onClick={() => nav.go({ name: 'toolsLibrary' })}
            trailing={<CaretRight size={16} className="text-muted" />}
          />
          <Row
            icon={<ArrowsClockwise size={18} weight="bold" />}
            title={t('tileCycle')}
            sub={v.cycle.length ? t('cycleSteps', { n: v.cycle.length }) : t('cycleNone')}
            onClick={() => nav.go({ name: 'cycle' })}
            trailing={<CaretRight size={16} className="text-muted" />}
          />
        </Group>
      </div>
    </div>
  )
}

function Tile({
  icon,
  title,
  text,
  foot,
  onClick,
  className,
  tone,
  decor,
  motionProps,
  wide,
}: {
  icon: ReactNode
  title: string
  text: string
  foot?: string
  onClick: () => void
  className?: string
  tone?: 'accent'
  decor?: ReactNode
  motionProps: object
  wide?: boolean
}) {
  return (
    <motion.button
      {...motionProps}
      onClick={onClick}
      className={cx(
        'relative flex overflow-hidden rounded-card p-4 text-left shadow-card active:scale-[0.97]',
        wide ? 'flex-row items-start gap-4' : 'min-h-[132px] flex-col',
        tone ? 'bg-accent-soft' : 'bg-surface',
        className,
      )}
    >
      {decor}
      <span
        className={cx(
          'relative grid size-10 shrink-0 place-items-center rounded-full',
          tone ? 'bg-accent text-accent-ink' : 'bg-accent-soft text-accent',
        )}
      >
        {icon}
      </span>
      <span className={cx('relative', wide ? 'min-w-0 flex-1' : 'mt-auto pt-4')}>
        <span className="block text-[16.5px] leading-tight font-[620] tracking-[-0.01em]">{title}</span>
        <span className={cx('mt-1 line-clamp-3 block text-[13.5px] leading-snug', tone ? 'text-accent-deep/80' : 'text-muted')}>{text}</span>
        {foot && <span className="mt-3 block text-[13px] font-medium text-accent-deep">{foot}</span>}
      </span>
    </motion.button>
  )
}

function BreathDecor() {
  return (
    <span aria-hidden className="pointer-events-none absolute -top-8 -right-8 size-32">
      <span className="absolute inset-0 rounded-full border border-accent/25 motion-safe:animate-[breathe-ring_4s_ease-in-out_infinite_alternate]" />
      <span className="absolute inset-5 rounded-full border border-accent/30" />
      <span className="absolute inset-10 rounded-full bg-accent/10" />
    </span>
  )
}
