import { CheckCircle, PencilSimple, Star } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, Screen, Segmented, Toggle, inputClass } from '../components/ui'
import { configChanges } from '../lib/tools'
import { TOOL_ICONS } from './Tools'
import { renderMarkdown } from '../lib/markdown'
import { flush, useV } from '../lib/store'
import { useNav } from '../nav'
import { fmtUsd } from './Sessions'
import { approve } from './sessionLogic'
import { t, useLang } from '../lib/i18n'

type Tab = 'report' | 'file' | 'cycle' | 'tools'

export function Review({ id }: { id: string }) {
  const v = useV()
  const nav = useNav()
  const s = v.sessions.find((x) => x.id === id)
  const [tab, setTab] = useState<Tab>('report')
  const [editing, setEditing] = useState(false)
  const [report, setReport] = useState(s?.draft?.report ?? '')
  const [clientFile, setClientFile] = useState(s?.draft?.clientFile ?? '')
  const [applyTools, setApplyTools] = useState(true)
  const lang = useLang()

  if (!s?.draft) {
    return (
      <Screen title={t('report')} onBack={nav.back}>
        <p className="text-muted">{t('noPendingReport')}</p>
      </Screen>
    )
  }

  const save = async () => {
    approve(id, { report, clientFile, applyTools })
    await flush()
    nav.tab('files')
  }

  const changes = s.draft.tools ? configChanges(v.tools, s.draft.tools, lang) : []
  const text = tab === 'report' ? report : clientFile
  const setText = tab === 'report' ? setReport : setClientFile

  return (
    <Screen
      title={t('reportOf', { n: s.no })}
      onBack={nav.back}
      action={
        (tab === 'report' || tab === 'file') && (
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
            ...(changes.length ? [{ value: 'tools' as const, label: t('tabTools') }] : []),
          ]}
        />
      </div>

      {tab === 'tools' ? (
        <div>
          <p className="mb-3 text-[15px] text-muted">{t('toolsChanges')}</p>
          <ul className="space-y-3">
            {changes.map((c) => {
              const I = TOOL_ICONS[c.kind]
              return (
                <li key={c.kind} className="flex gap-3 rounded-card bg-surface p-4 shadow-card">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <I size={18} weight="bold" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-[620]">{c.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-[12.5px] font-medium text-accent">
                      {c.featured && (
                        <span className="flex items-center gap-1">
                          <Star size={12} weight="fill" /> {t('toolFeatured')}
                        </span>
                      )}
                      {c.unfeatured && <span className="text-muted">{t('toolUnfeatured')}</span>}
                      {c.changed && <span>{t('toolUpdated')}</span>}
                    </span>
                    {c.why && <span className="mt-1.5 block text-[14.5px] leading-snug text-muted">{c.why}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 rounded-card bg-surface px-4 shadow-card">
            <Toggle checked={applyTools} onChange={setApplyTools} label={t('applyTools')} />
          </div>
        </div>
      ) : tab === 'cycle' ? (
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
