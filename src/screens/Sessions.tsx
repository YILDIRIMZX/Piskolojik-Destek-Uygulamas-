import { ArrowRight, ChatsCircle, Clock, Sparkle } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, Card, Group, Row, Segmented, Sheet } from '../components/ui'
import { MODEL_LABELS } from '../lib/claude'
import { update, useV } from '../lib/store'
import type { ModelId, Session } from '../lib/types'
import { useNav } from '../nav'
import { nextPlan } from './Home'
import { SESSION_MINUTES, createSession, nextSessionNo, remainingMinutes } from './sessionLogic'

const statusLabel: Record<Session['status'], string> = {
  active: 'Devam ediyor',
  closing: 'Kapanıyor',
  review: 'Rapor onayı bekliyor',
  done: 'Tamamlandı',
}

export const fmtUsd = (n: number) => `$${n < 0.1 ? n.toFixed(3) : n.toFixed(2)}`

export function Sessions() {
  const v = useV()
  const nav = useNav()
  const [confirm, setConfirm] = useState(false)
  const open = v.sessions.find((s) => s.status !== 'done')
  const done = v.sessions.filter((s) => s.status === 'done')
  const plan = nextPlan(v)

  const begin = () => {
    setConfirm(false)
    nav.go({ name: 'session', id: createSession() })
  }

  return (
    <div className="pt-safe mx-auto max-w-xl px-4 pb-32">
      <h1 className="pt-2 pb-5 text-[30px] leading-tight font-[680] tracking-[-0.03em]">Seans</h1>

      {open ? (
        <Card className="mb-6 p-5" onClick={() => nav.go({ name: open.status === 'review' ? 'review' : 'session', id: open.id })}>
          <p className="text-[13px] font-medium text-accent">{statusLabel[open.status]}</p>
          <p className="mt-1 text-[22px] font-[650] tracking-[-0.02em]">Seans {open.no}</p>
          <p className="mt-1 text-[15px] text-muted">
            {open.status === 'review' ? 'Raporu okuyup onayla.' : `${Math.max(0, Math.ceil(remainingMinutes(open)))} dakika kaldı.`}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-accent">
            {open.status === 'review' ? 'Raporu aç' : 'Devam et'} <ArrowRight size={16} weight="bold" />
          </span>
        </Card>
      ) : (
        <Card className="mb-6 p-5">
          <p className="text-[22px] font-[650] tracking-[-0.02em]">Seans {nextSessionNo(v)}</p>
          {plan && <p className="mt-2 line-clamp-4 text-[15px] leading-snug text-muted">{plan}</p>}
          <div className="mt-4 flex items-center gap-4 text-[13.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <Clock size={16} /> {SESSION_MINUTES} dk
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkle size={16} /> {MODEL_LABELS[v.settings.model]}
            </span>
          </div>
          <Button size="lg" className="mt-5 w-full" disabled={!v.apiKey} onClick={() => setConfirm(true)}>
            Seansı başlat
          </Button>
          {!v.apiKey && (
            <p className="mt-3 text-center text-[13.5px] text-muted">
              Seans için önce{' '}
              <button className="text-accent underline underline-offset-2" onClick={() => nav.go({ name: 'settings' })}>
                API anahtarını ekle
              </button>
              .
            </p>
          )}
        </Card>
      )}

      {done.length > 0 && (
        <Group title="Geçmiş seanslar">
          {done.map((s) => {
            const report = v.reports.find((r) => r.no === s.no)
            return (
              <Row
                key={s.id}
                icon={<ChatsCircle size={18} weight="bold" />}
                title={report?.title ?? `Seans ${s.no}`}
                sub={`${new Date(s.startedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · ${Math.round(s.activeMs / 60000)} dk, ${fmtUsd(s.usage.usd)}`}
                onClick={() => (report ? nav.go({ name: 'report', id: report.id }) : undefined)}
              />
            )
          })}
        </Group>
      )}

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Seansa hazır mısın?">
        <p className="text-[15.5px] leading-relaxed text-muted">
          Sakin bir yer bul. İstersen konuşarak, istersen yazarak ilerleyebilirsin. Süre sadece bu ekran açıkken işler.
        </p>
        <p className="mt-5 mb-2 text-[14px] font-medium">Model</p>
        <Segmented<ModelId>
          value={v.settings.model}
          onChange={(model) => update((x) => ({ ...x, settings: { ...x.settings, model } }))}
          options={[
            { value: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
            { value: 'claude-opus-5-5', label: 'Opus 5.5' },
          ]}
        />
        <p className="mt-2 text-[13px] text-muted">
          {v.settings.model === 'claude-sonnet-5-5'
            ? 'Hızlı ve dengeli. Seans başına tahminen $0.30-1.'
            : 'Daha derin, daha yavaş. Seans başına tahminen $0.60-2.'}
        </p>
        <Button size="lg" className="mt-6 mb-2 w-full" onClick={begin}>
          Başla
        </Button>
      </Sheet>
    </div>
  )
}
