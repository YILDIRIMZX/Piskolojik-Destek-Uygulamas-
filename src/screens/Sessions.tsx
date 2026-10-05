import { ArrowRight, ChatsCircle, Clock, Sparkle } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, Card, Group, Row, Segmented, Sheet } from '../components/ui'
import { MODEL_LABELS } from '../lib/claude'
import { update, useV } from '../lib/store'
import type { ModelId, Session } from '../lib/types'
import { useNav } from '../nav'
import { nextPlan } from './Home'
import { SESSION_MINUTES, createSession, nextSessionNo, remainingMinutes } from './sessionLogic'
import { locale, t, type Key } from '../lib/i18n'

const statusLabel: Record<Session['status'], Key> = {
  active: 'statusActive',
  closing: 'statusClosing',
  review: 'statusReview',
  done: 'statusDone',
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
      <h1 className="pt-2 pb-5 text-[30px] leading-tight font-[680] tracking-[-0.03em]">{t('tabSessions')}</h1>

      {open ? (
        <Card className="mb-6 p-5" onClick={() => nav.go({ name: open.status === 'review' ? 'review' : 'session', id: open.id })}>
          <p className="text-[13px] font-medium text-accent">{t(statusLabel[open.status])}</p>
          <p className="mt-1 text-[22px] font-[650] tracking-[-0.02em]">{t('sessionN', { n: open.no })}</p>
          <p className="mt-1 text-[15px] text-muted">
            {open.status === 'review' ? t('reportReadySub') : t('minutesLeft', { n: Math.max(0, Math.ceil(remainingMinutes(open))) })}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-accent">
            {open.status === 'review' ? t('openReport') : t('continue')} <ArrowRight size={16} weight="bold" />
          </span>
        </Card>
      ) : (
        <Card className="mb-6 p-5">
          <p className="text-[22px] font-[650] tracking-[-0.02em]">{t('sessionN', { n: nextSessionNo(v) })}</p>
          {plan && <p className="mt-2 line-clamp-4 text-[15px] leading-snug text-muted">{plan}</p>}
          <div className="mt-4 flex items-center gap-4 text-[13.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <Clock size={16} /> {t('minutesShort', { n: SESSION_MINUTES })}
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkle size={16} /> {MODEL_LABELS[v.settings.model]}
            </span>
          </div>
          <Button size="lg" className="mt-5 w-full" disabled={!v.apiKey} onClick={() => setConfirm(true)}>
            {t('startSession')}
          </Button>
          {!v.apiKey && (
            <p className="mt-3 text-center text-[13.5px] text-muted">
              {t('addKeyFirst')}{' '}
              <button className="text-accent underline underline-offset-2" onClick={() => nav.go({ name: 'settings' })}>
                {t('addKeyLink')}
              </button>
              .
            </p>
          )}
        </Card>
      )}

      {done.length > 0 && (
        <Group title={t('pastSessions')}>
          {done.map((s) => {
            const report = v.reports.find((r) => r.no === s.no)
            return (
              <Row
                key={s.id}
                icon={<ChatsCircle size={18} weight="bold" />}
                title={report?.title ?? t('sessionN', { n: s.no })}
                sub={`${new Date(s.startedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })} · ${t('minutesShort', { n: Math.round(s.activeMs / 60000) })}, ${fmtUsd(s.usage.usd)}`}
                onClick={() => (report ? nav.go({ name: 'report', id: report.id }) : undefined)}
              />
            )
          })}
        </Group>
      )}

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t('readyTitle')}>
        <p className="text-[15.5px] leading-relaxed text-muted">
          {t('readyText')}
        </p>
        <p className="mt-5 mb-2 text-[14px] font-medium">{t('model')}</p>
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
            ? t('sonnetHint')
            : t('opusHint')}
        </p>
        <Button size="lg" className="mt-6 mb-2 w-full" onClick={begin}>
          {t('start')}
        </Button>
      </Sheet>
    </div>
  )
}
