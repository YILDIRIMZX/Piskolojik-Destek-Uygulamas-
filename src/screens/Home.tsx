import { ArrowRight, Flower, GearSix, Heart, NotePencil, Wind, ArrowsClockwise } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { EmergencyButton } from '../components/Emergency'
import { cx, IconButton } from '../components/ui'
import { useNav } from '../nav'
import { useV } from '../lib/store'
import type { Vault } from '../lib/types'
import { SESSION_MINUTES, nextSessionNo, remainingMinutes } from './sessionLogic'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return 'İyi geceler'
  if (h < 12) return 'Günaydın'
  if (h < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

/** The "next session" plan from the client file (or the last report), as plain text. */
export function nextPlan(v: Vault): string | null {
  const sources = [v.clientFile, v.reports[0]?.markdown ?? '']
  for (const src of sources) {
    const m = src.match(/^##+\s*(?:\d+\.\s*)?Bir sonraki seans[^\n]*\n([\s\S]*?)(?=\n##?\s|$)/im)
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
  const weekAgo = Date.now() - 7 * 864e5
  const weekEntries = v.journal.filter((e) => e.ts > weekAgo).length

  const hero = review
    ? { label: `Seans ${review.no} raporu hazır`, sub: 'Raporu okuyup onayla.', cta: 'Raporu aç', go: () => nav.go({ name: 'review', id: review.id }) }
    : active
      ? {
          label: `Seans ${active.no} devam ediyor`,
          sub: `${Math.ceil(remainingMinutes(active))} dakika kaldı.`,
          cta: 'Devam et',
          go: () => nav.go({ name: 'session', id: active.id }),
        }
      : {
          label: `Seans ${nextSessionNo(v)}`,
          sub: plan ?? `${SESSION_MINUTES} dakikalık bir seans. Hazır olduğunda başlayalım.`,
          cta: 'Seansı başlat',
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
          <p className="text-[14px] text-muted">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <div className="flex items-center gap-2">
            <EmergencyButton onClick={nav.openEmergency} />
            <IconButton label="Ayarlar" onClick={() => nav.go({ name: 'settings' })}>
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

        <Tile
          motionProps={item(1)}
          className="row-span-2 bg-accent-soft"
          onClick={nav.newEntry}
          icon={<NotePencil size={22} weight="bold" />}
          title="Yerim yok anı"
          text="Olayı, düşünceyi, duyguyu ve ne yaptığını kaydet."
          foot={weekEntries ? `Bu hafta ${weekEntries} kayıt` : 'Bu hafta kayıt yok'}
          tone="accent"
        />
        <Tile
          motionProps={item(2)}
          onClick={() => nav.go({ name: 'cycle' })}
          icon={<ArrowsClockwise size={22} weight="bold" />}
          title="Döngüm"
          text={v.cycle.length ? `${v.cycle.length} adım` : 'Henüz çıkarılmadı'}
        />
        <Tile
          motionProps={item(3)}
          onClick={() => nav.go({ name: 'breathe' })}
          icon={<Wind size={22} weight="bold" />}
          title="Nefes"
          text="4-7-8 ile yavaşla"
          decor={<BreathDecor />}
        />
        <Tile
          motionProps={item(4)}
          onClick={() => nav.go({ name: 'compassion' })}
          icon={<Heart size={22} weight="bold" />}
          title="Öz-şefkat molası"
          text="Üç adımda kendine nazik ol"
        />
        <Tile
          motionProps={item(5)}
          onClick={() => nav.go({ name: 'underneath' })}
          icon={<Flower size={22} weight="bold" />}
          title="Öfkenin altında"
          text="Asıl duyguyu bul"
        />
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
}) {
  return (
    <motion.button
      {...motionProps}
      onClick={onClick}
      className={cx(
        'relative flex min-h-[132px] flex-col overflow-hidden rounded-card p-4 text-left shadow-card active:scale-[0.97]',
        tone ? '' : 'bg-surface',
        className,
      )}
    >
      {decor}
      <span
        className={cx(
          'relative grid size-10 place-items-center rounded-full',
          tone ? 'bg-accent text-accent-ink' : 'bg-accent-soft text-accent',
        )}
      >
        {icon}
      </span>
      <span className="relative mt-auto pt-4">
        <span className="block text-[16.5px] leading-tight font-[620] tracking-[-0.01em]">{title}</span>
        <span className={cx('mt-1 block text-[13.5px] leading-snug', tone ? 'text-accent-deep/80' : 'text-muted')}>{text}</span>
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
