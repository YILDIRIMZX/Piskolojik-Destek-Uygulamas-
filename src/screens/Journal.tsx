import { NotePencil, Plus, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { MicButton } from '../components/MicButton'
import { Button, Empty, Field, Sheet, cx, inputClass } from '../components/ui'
import { update, useV } from '../lib/store'
import { uid, type JournalEntry } from '../lib/types'
import { useNav } from '../nav'

export const EMOTIONS = ['Öfke', 'İncinme', 'Yalnızlık', 'Utanç', 'Kaygı', 'Hayal kırıklığı', 'Değersizlik', 'Kıskançlık', 'Üzüntü']

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
        <h1 className="text-[30px] leading-tight font-[680] tracking-[-0.03em]">Günlük</h1>
        <Button size="sm" onClick={nav.newEntry}>
          <Plus size={16} weight="bold" /> Yeni kayıt
        </Button>
      </div>
      <p className="mb-5 text-[15px] leading-snug text-muted">
        "Yerim yok" anlarını yakala. Amaç düzeltmek değil, sadece fark etmek. Kayıtların bir sonraki seansta danışmanına iletilir.
      </p>

      {entries.length === 0 ? (
        <Empty
          icon={<NotePencil size={26} weight="bold" />}
          title="Henüz kayıt yok"
          text="Kenara itilmiş ya da yerin doldurulmuş gibi hissettiğin bir an olduğunda buraya yaz."
          action={<Button onClick={nav.newEntry}>İlk kaydı ekle</Button>}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <button key={e.id} onClick={() => setOpen(e)} className="block w-full rounded-card bg-surface p-4 text-left shadow-card active:scale-[0.985]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted">
                  {new Date(e.ts).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
                <Intensity value={e.intensity} />
              </div>
              <p className="mt-1.5 line-clamp-2 text-[16px] leading-snug">{e.event || 'Olay yazılmamış'}</p>
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
    <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted" aria-label={`Yoğunluk ${value}/10`}>
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
    if (!confirm('Bu kayıt silinsin mi?')) return
    update((v) => ({ ...v, journal: v.journal.filter((x) => x.id !== e.id) }))
    onClose()
  }

  const text = (k: 'event' | 'thought' | 'behavior' | 'underneath', label: string, hint: string) => (
    <Field label={label}>
      <div className="flex items-start gap-2">
        <textarea
          value={e[k]}
          onChange={(ev) => set(k, ev.target.value)}
          placeholder={hint}
          rows={2}
          className={`${inputClass} [field-sizing:content] min-h-[76px] resize-none`}
        />
        <MicButton value={e[k]} onChange={(val) => set(k, val)} />
      </div>
    </Field>
  )

  return (
    <Sheet open onClose={onClose} title={existing ? 'Kayıt' : 'Yerim yok anı'}>
      {text('event', 'Ne oldu?', 'Kısaca olayı anlat')}
      {text('thought', 'Aklından ne geçti?', 'O an kendine ne söyledin?')}
      <Field label="Ne hissettin?" group>
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map((emo) => (
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
      <Field label={`Ne kadar yoğundu? ${e.intensity}/10`}>
        <input
          type="range"
          min={0}
          max={10}
          value={e.intensity}
          onChange={(ev) => set('intensity', Number(ev.target.value))}
          className="h-8 w-full accent-[var(--accent)]"
        />
      </Field>
      {text('behavior', 'Ne yaptın?', 'Tepkin ne oldu?')}
      {text('underneath', 'Öfkenin altında başka bir şey var mıydı?', 'İsteğe bağlı')}
      <div className="mt-2 mb-2 flex gap-2">
        {existing && (
          <Button variant="secondary" onClick={remove} aria-label="Kaydı sil" className="w-12 px-0 text-danger">
            <Trash size={18} weight="bold" />
          </Button>
        )}
        <Button size="lg" className="flex-1" onClick={save} disabled={!e.event.trim() && !e.thought.trim()}>
          Kaydet
        </Button>
      </div>
    </Sheet>
  )
}
