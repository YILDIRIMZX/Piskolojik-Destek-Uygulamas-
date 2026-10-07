import { NotePencil, Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { TextField } from '../components/TextField'
import { Button, Empty, Field, Sheet, cx } from '../components/ui'
import { locale, t } from '../lib/i18n'
import { update, useV } from '../lib/store'
import { uid, type JournalEntry, type ToolEntry } from '../lib/types'
import { useNav } from '../nav'
import { TOOL_ICONS, useTool } from './Tools'

const blank = (): JournalEntry => ({
  id: uid(),
  ts: Date.now(),
  event: '',
  thought: '',
  emotions: [],
  intensity: 5,
  behavior: '',
  underneath: '',
})

const when = (ts: number) => new Date(ts).toLocaleString(locale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

type Item = { type: 'moment'; e: JournalEntry } | { type: 'tool'; e: ToolEntry }

export function Journal() {
  const v = useV()
  const nav = useNav()
  const moment = useTool('moment')
  const [open, setOpen] = useState<JournalEntry | null>(null)
  const [openTool, setOpenTool] = useState<ToolEntry | null>(null)
  const items: Item[] = [
    ...v.journal.map((e) => ({ type: 'moment' as const, e })),
    ...(v.toolEntries ?? []).map((e) => ({ type: 'tool' as const, e })),
  ].sort((a, b) => b.e.ts - a.e.ts)

  return (
    <div className="pt-safe mx-auto max-w-xl px-4 pb-32">
      <div className="flex items-center justify-between pt-2 pb-2">
        <h1 className="text-[30px] leading-tight font-[680] tracking-[-0.03em]">{t('journal')}</h1>
        <Button size="sm" onClick={nav.newEntry}>
          <Plus size={16} weight="bold" /> {t('newEntry')}
        </Button>
      </div>
      <p className="mb-5 text-[15px] leading-snug text-muted">{t('journalIntro')}</p>

      {items.length === 0 ? (
        <Empty
          icon={<NotePencil size={26} weight="bold" />}
          title={t('noEntries')}
          text={t('noEntriesText')}
          action={<Button onClick={nav.newEntry}>{moment.title}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {items.map((it) =>
            it.type === 'moment' ? (
              <button key={it.e.id} onClick={() => setOpen(it.e)} className="block w-full rounded-card bg-surface p-4 text-left shadow-card active:scale-[0.985]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-muted">{when(it.e.ts)}</span>
                  <Intensity value={it.e.intensity} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-[16px] leading-snug">{it.e.event || t('noEvent')}</p>
                {it.e.emotions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {it.e.emotions.map((x) => (
                      <span key={x} className="rounded-full bg-accent-soft px-2.5 py-1 text-[12.5px] font-medium text-accent-deep">
                        {x}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ) : (
              <ToolEntryCard key={it.e.id} e={it.e} onClick={() => setOpenTool(it.e)} />
            ),
          )}
        </div>
      )}

      {open && <EntrySheet entry={open} onClose={() => setOpen(null)} existing />}
      {openTool && <ToolEntrySheet entry={openTool} onClose={() => setOpenTool(null)} />}
    </div>
  )
}

function ToolEntryCard({ e, onClick }: { e: ToolEntry; onClick: () => void }) {
  const I = TOOL_ICONS[e.kind]
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 rounded-card bg-surface p-4 text-left shadow-card active:scale-[0.985]">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <I size={18} weight="bold" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-[15px] font-[620]">{e.title}</span>
          <span className="shrink-0 text-[13px] text-muted">{when(e.ts)}</span>
        </span>
        <span className="mt-1 line-clamp-2 block text-[14.5px] leading-snug text-muted">{e.fields[0]?.value}</span>
      </span>
    </button>
  )
}

function ToolEntrySheet({ entry, onClose }: { entry: ToolEntry; onClose: () => void }) {
  const remove = () => {
    if (!confirm(t('deleteConfirm'))) return
    update((v) => ({ ...v, toolEntries: (v.toolEntries ?? []).filter((x) => x.id !== entry.id) }))
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={entry.title}>
      <p className="mb-4 text-[13px] text-muted">{when(entry.ts)}</p>
      <dl className="space-y-3">
        {entry.fields.map((f, i) => (
          <div key={i}>
            <dt className="text-[13px] font-medium text-muted">{f.label}</dt>
            <dd className="mt-0.5 text-[16px] leading-snug whitespace-pre-wrap">{f.value}</dd>
          </div>
        ))}
      </dl>
      <Button variant="secondary" className="mt-6 mb-2 w-full text-danger" onClick={remove}>
        <Trash size={18} weight="bold" /> {t('deleteEntry')}
      </Button>
    </Sheet>
  )
}

function Intensity({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted" aria-label={t('intensityAria', { n: value })}>
      <span className="font-mono tabular-nums">{value}</span>
      <span className="flex gap-[3px]">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cx('h-3 w-[3px] rounded-full', i < Math.round(value / 2) ? 'bg-accent' : 'bg-surface-2')} />
        ))}
      </span>
    </span>
  )
}

export function NewEntrySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <EntrySheet entry={blank()} onClose={onClose} /> : null
}

function EntrySheet({ entry, onClose, existing }: { entry: JournalEntry; onClose: () => void; existing?: boolean }) {
  const s = useTool('moment')
  const [e, setE] = useState(entry)
  const set = <K extends keyof JournalEntry>(k: K, val: JournalEntry[K]) => setE((x) => ({ ...x, [k]: val }))
  const toggle = (emo: string) => set('emotions', e.emotions.includes(emo) ? e.emotions.filter((x) => x !== emo) : [...e.emotions, emo])
  // Keep emotions picked earlier even if the counselor later changes the list.
  const emotions = [...(s.emotions ?? []), ...e.emotions.filter((x) => !(s.emotions ?? []).includes(x))]

  const save = () => {
    update((v) => ({ ...v, journal: existing ? v.journal.map((x) => (x.id === e.id ? e : x)) : [e, ...v.journal] }))
    onClose()
  }
  const remove = () => {
    if (!confirm(t('deleteConfirm'))) return
    update((v) => ({ ...v, journal: v.journal.filter((x) => x.id !== e.id) }))
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={existing ? t('entry') : s.title}>
      {!existing && s.why && <p className="mb-4 rounded-field bg-accent-soft p-3 text-[14px] leading-snug text-accent-deep">{s.why}</p>}
      <TextField label={t('qEvent')} hint={t('qEventHint')} value={e.event} onChange={(x) => set('event', x)} />
      <TextField label={t('qThought')} hint={t('qThoughtHint')} value={e.thought} onChange={(x) => set('thought', x)} />
      <Field label={t('qFeel')} group>
        <div className="flex flex-wrap gap-2">
          {emotions.map((emo) => (
            <button
              key={emo}
              type="button"
              onClick={() => toggle(emo)}
              aria-pressed={e.emotions.includes(emo)}
              className={cx('h-9 rounded-full px-3.5 text-[14px] font-medium transition-colors', e.emotions.includes(emo) ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink')}
            >
              {emo}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('qIntensity', { n: e.intensity })}>
        <input type="range" min={0} max={10} value={e.intensity} onChange={(ev) => set('intensity', Number(ev.target.value))} className="h-8 w-full accent-[var(--accent)]" />
      </Field>
      <TextField label={t('qBehavior')} hint={t('qBehaviorHint')} value={e.behavior} onChange={(x) => set('behavior', x)} />
      <TextField label={s.underneathLabel ?? t('qUnder')} hint={t('optional')} value={e.underneath} onChange={(x) => set('underneath', x)} />
      <div className="mt-2 mb-2 flex gap-2">
        {existing && (
          <Button variant="secondary" onClick={remove} aria-label={t('deleteEntry')} className="w-12 px-0 text-danger">
            <Trash size={18} weight="bold" />
          </Button>
        )}
        <Button size="lg" className="flex-1" onClick={save} disabled={!e.event.trim() && !e.thought.trim()}>
          {t('save')}
        </Button>
      </div>
    </Sheet>
  )
}
