import { CheckCircle, PencilSimple } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, Screen, Segmented, inputClass } from '../components/ui'
import { renderMarkdown } from '../lib/markdown'
import { flush, useV } from '../lib/store'
import { useNav } from '../nav'
import { fmtUsd } from './Sessions'
import { approve } from './sessionLogic'
import { t } from '../lib/i18n'

type Tab = 'report' | 'file' | 'cycle'

export function Review({ id }: { id: string }) {
  const v = useV()
  const nav = useNav()
  const s = v.sessions.find((x) => x.id === id)
  const [tab, setTab] = useState<Tab>('report')
  const [editing, setEditing] = useState(false)
  const [report, setReport] = useState(s?.draft?.report ?? '')
  const [clientFile, setClientFile] = useState(s?.draft?.clientFile ?? '')

  if (!s?.draft) {
    return (
      <Screen title={t('report')} onBack={nav.back}>
        <p className="text-muted">{t('noPendingReport')}</p>
      </Screen>
    )
  }

  const save = async () => {
    approve(id, { report, clientFile })
    await flush()
    nav.tab('files')
  }

  const text = tab === 'report' ? report : clientFile
  const setText = tab === 'report' ? setReport : setClientFile

  return (
    <Screen
      title={t('reportOf', { n: s.no })}
      onBack={nav.back}
      action={
        tab !== 'cycle' && (
          <button onClick={() => setEditing((e) => !e)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] text-accent">
            {editing ? <CheckCircle size={18} weight="bold" /> : <PencilSimple size={18} weight="bold" />}
            {editing ? t('done') : t('edit')}
          </button>
        )
      }
    >
      <p className="-mt-3 mb-4 text-[14px] text-muted">
        {t('reviewText', { n: fmtUsd(s.usage.usd) })}
      </p>
      <div className="sticky top-[calc(max(env(safe-area-inset-top),12px)+46px)] z-10 -mx-1 mb-4 px-1">
        <Segmented<Tab>
          value={tab}
          onChange={(x) => {
            setTab(x)
            setEditing(false)
          }}
          options={[
            { value: 'report', label: t('tabReport') },
            { value: 'file', label: t('tabFile') },
            { value: 'cycle', label: t('tabCycle') },
          ]}
        />
      </div>

      {tab === 'cycle' ? (
        s.draft.cycle.length ? (
          <ol className="space-y-3">
            {s.draft.cycle.map((c, i) => (
              <li key={i} className="rounded-card bg-surface p-4 shadow-card">
                <p className="text-[16px] font-[620]">{c.title}</p>
                <p className="mt-1 text-[14.5px] text-muted">{c.detail}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[15px] text-muted">{t('cycleUnchanged')}</p>
        )
      ) : editing ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} min-h-[60dvh] font-mono text-[14px] leading-relaxed`} />
      ) : (
        <article className="prose-seans rounded-card bg-surface p-5 shadow-card" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
      )}

      <Button size="lg" className="mt-6 w-full" onClick={save}>
        {t('approve')}
      </Button>
      <p className="mt-2 text-center text-[13px] text-muted">{t('approveNote')}</p>
    </Screen>
  )
}
