import { ArrowsClockwise, CaretRight, FileText, IdentificationCard } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, Empty, Group, Row, Screen } from '../components/ui'
import { describeError } from '../lib/claude'
import { renderMarkdown } from '../lib/markdown'
import { useV } from '../lib/store'
import { useNav } from '../nav'
import { extractCycle } from './sessionLogic'

const chevron = <CaretRight size={16} className="text-muted" />

export function Files() {
  const v = useV()
  const nav = useNav()
  return (
    <div className="pt-safe mx-auto max-w-xl px-4 pb-32">
      <h1 className="pt-2 pb-5 text-[30px] leading-tight font-[680] tracking-[-0.03em]">Dosyam</h1>
      <Group>
        <Row
          icon={<IdentificationCard size={18} weight="bold" />}
          title="Danışan dosyası"
          sub={v.clientFile ? 'Seanslarla birlikte güncellenir' : 'Henüz yok'}
          onClick={() => nav.go({ name: 'clientFile' })}
          trailing={chevron}
        />
        <Row
          icon={<ArrowsClockwise size={18} weight="bold" />}
          title="Döngüm"
          sub={v.cycle.length ? `${v.cycle.length} adım` : 'Henüz çıkarılmadı'}
          onClick={() => nav.go({ name: 'cycle' })}
          trailing={chevron}
        />
      </Group>

      {v.reports.length ? (
        <Group title="Seans raporları">
          {v.reports.map((r) => (
            <Row
              key={r.id}
              icon={<FileText size={18} weight="bold" />}
              title={r.title}
              sub={`Seans ${r.no} · ${r.date}`}
              onClick={() => nav.go({ name: 'report', id: r.id })}
              trailing={chevron}
            />
          ))}
        </Group>
      ) : (
        <Empty icon={<FileText size={26} weight="bold" />} title="Henüz rapor yok" text="Her seansın sonunda bir rapor hazırlanır ve burada saklanır." />
      )}
    </div>
  )
}

export function ReportView({ id }: { id: string }) {
  const v = useV()
  const nav = useNav()
  const r = v.reports.find((x) => x.id === id)
  return (
    <Screen title={r ? `Seans ${r.no}` : 'Rapor'} onBack={nav.back}>
      {r ? (
        <article className="prose-seans rounded-card bg-surface p-5 shadow-card" dangerouslySetInnerHTML={{ __html: renderMarkdown(r.markdown) }} />
      ) : (
        <p className="text-muted">Rapor bulunamadı.</p>
      )}
    </Screen>
  )
}

export function ClientFile() {
  const v = useV()
  const nav = useNav()
  return (
    <Screen title="Danışan dosyası" onBack={nav.back}>
      {v.clientFile ? (
        <article className="prose-seans rounded-card bg-surface p-5 shadow-card" dangerouslySetInnerHTML={{ __html: renderMarkdown(v.clientFile) }} />
      ) : (
        <Empty
          icon={<IdentificationCard size={26} weight="bold" />}
          title="Dosya henüz yok"
          text="İlk seansının sonunda oluşturulur. Ayarlar'dan bilgisayardaki dosyanı da aktarabilirsin."
        />
      )}
    </Screen>
  )
}

export function Cycle() {
  const v = useV()
  const nav = useNav()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canExtract = !!v.apiKey && (!!v.clientFile || v.reports.length > 0)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      await extractCycle()
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith('Döngü') ? e.message : describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title="Döngüm" onBack={nav.back}>
      <p className="-mt-2 mb-6 text-[15px] leading-snug text-muted">
        Tekrar eden örüntün adım adım. Her adımda bir çıkış yolu var. Döngüyü bir yerde kırmak, sonrasını değiştirir.
      </p>
      {v.cycle.length > 0 ? (
        <ol className="relative">
          <span aria-hidden className="absolute top-4 bottom-4 left-[17px] w-[2px] rounded-full bg-accent-soft" />
          {v.cycle.map((c, i) => (
            <li key={i} className="relative mb-4 flex gap-4">
              <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-accent font-mono text-[14px] font-semibold text-accent-ink tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 rounded-card bg-surface p-4 shadow-card">
                <p className="text-[16.5px] font-[620] tracking-[-0.01em]">{c.title}</p>
                <p className="mt-1 text-[14.5px] leading-snug text-muted">{c.detail}</p>
                {c.alternative && (
                  <p className="mt-3 rounded-[14px] bg-accent-soft px-3 py-2.5 text-[14.5px] leading-snug text-accent-deep">{c.alternative}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty
          icon={<ArrowsClockwise size={26} weight="bold" />}
          title="Döngü henüz çıkarılmadı"
          text={canExtract ? 'Dosyandan ve raporlarından döngünü çıkarabilirim.' : 'Seanslar ilerledikçe burada döngün oluşacak.'}
        />
      )}
      {canExtract && (
        <Button variant={v.cycle.length ? 'secondary' : 'primary'} size="lg" className="mt-4 w-full" disabled={busy} onClick={run}>
          {busy ? 'Çıkarılıyor…' : v.cycle.length ? 'Döngüyü yeniden çıkar' : 'Döngümü çıkar'}
        </Button>
      )}
      {error && <p className="mt-3 text-center text-[14px] text-danger">{error}</p>}
    </Screen>
  )
}
