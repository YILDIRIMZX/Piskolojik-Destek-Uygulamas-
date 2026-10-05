import { NotePencil, Plus, Trash } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { MicButton } from '../components/MicButton'
import { Button, Empty, Field, Sheet, cx, inputClass } from '../components/ui'
import { update, useV } from '../lib/store'
import { uid, type JournalEntry } from '../lib/types'
import { useNav } from '../nav'
import { EMOTIONS, getLang, locale, t } from '../lib/i18n'


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

export function Journal() {
  const v = useV()
  const nav = useNav()
  const [open, setOpen] = useState<JournalEntry | null>(null)
  const entries = [...v.journal].sort((a, b) => b.ts - a.ts)

  return (
    <div className="pt-safe mx-auto max-w-xl px-4 pb-32">
      <div className="flex items-center justify-between pt-2 pb-2">
        <h1 className="text-[30px] leading-tight font-[680] tracking-[-0.03em]">{t('journal')}</h1>
        <Button size="sm" onClick={nav.newEntry}>
          <Plus size={16} weight="bold" /> {t('newEntry')}
        </Button>
      </div>
      <p className="mb-5 text-[15px] leading-snug text-muted">
        {t('journalIntro')}
      </p>

      {entries.length === 0 ? (
        <Empty
          icon={<NotePencil size={26} weight="bold" />}
          title={t('noEntries')}
          text={t('noEntriesText')}
          action={<Button onClick={nav.newEntry}>{t('firstEntry')}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <button key={e.id} onClick={() => setOpen(e)} className="block w-full rounded-card bg-surface p-4 text-left shadow-card active:scale-[0.985]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted">
                  {new Date(e.ts).toLocaleString(locale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
                <Intensity value={e.intensity} />
              </div>
              <p className="mt-1.5 line-clamp-2 text-[16px] leading-snug">{e.event || t('noEvent')}</p>
              {e.emotions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {e.emotions.map((x) => (
                    <span key={x} className="rounded-full bg-accent-soft px-2.5 py-1 text-[12.5px] font-medium text-accent-deep">
                      {x}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {open && <EntrySheet entry={open} onClose={() => setOpen(null)} existing />}
    </div>
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
  const [e, setE] = useState(entry)
  const set = <K extends keyof JournalEntry>(k: K, val: JournalEntry[K]) => setE((x) => ({ ...x, [k]: val }))
  const toggle = (emo: string) => set('emotions', e.emotions.includes(emo) ? e.emotions.filter((x) => x !== emo) : [...e.emotions, emo])

  const save = () => {
    update((v) => ({ ...v, journal: existing ? v.journal.map((x) => (x.id === e.id ? e : x)) : [e, ...v.journal] }))
    onClose()
  }
  const remove = () => {
    if (!confirm(t('deleteConfirm'))) return
    update((v) => ({ ...v, journal: v.journal.filter((x) => x.id !== e.id) }))
    onClose()
  }

  const text = (k: 'event' | 'thought' | 'behavior' | 'underneath', label: string, hint: string) => (
    <TextField label={label} hint={hint} value={e[k]} onChange={(val) => set(k, val)} />
  )

  return (
    <Sheet open onClose={onClose} title={existing ? t('entry') : t('tileEntryTitle')}>
      {text('event', t('qEvent'), t('qEventHint'))}
      {text('thought', t('qThought'), t('qThoughtHint'))}
      <Field label={t('qFeel')} group>
        <div className="flex flex-wrap gap-2">
          {EMOTIONS[getLang()].map((emo) => (
            <button
              key={emo}
              type="button"
              onClick={() => toggle(emo)}
              aria-pressed={e.emotions.includes(emo)}
              className={cx(
                'h-9 rounded-full px-3.5 text-[14px] font-medium transition-colors',
                e.emotions.includes(emo) ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink',
              )}
            >
              {emo}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('qIntensity', { n: e.intensity })}>
        <input
          type="range"
          min={0}
          max={10}
          value={e.intensity}
          onChange={(ev) => set('intensity', Number(ev.target.value))}
          className="h-8 w-full accent-[var(--accent)]"
        />
      </Field>
      {text('behavior', t('qBehavior'), t('qBehaviorHint'))}
      {text('underneath', t('qUnder'), t('optional'))}
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

function TextField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  return (
    <Field label={label}>
      <div className="flex items-start gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          placeholder={hint}
          rows={2}
          className={`${inputClass} [field-sizing:content] min-h-[76px] resize-none`}
        />
        <MicButton value={value} onChange={onChange} target={ref} />
      </div>
    </Field>
  )
}
