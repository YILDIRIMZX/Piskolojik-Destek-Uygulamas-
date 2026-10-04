import { Check, DownloadSimple, Export, FileArrowUp, Key, LockKey, Password, Trash, UploadSimple } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { PIN_LENGTH, PinPad } from '../components/PinPad'
import { Button, Field, Group, Row, Screen, Segmented, Sheet, Toggle, inputClass } from '../components/ui'
import { checkKey, describeError } from '../lib/claude'
import { exportBackup, exportMarkdown, importMarkdownFiles, mergeReports, readBackup } from '../lib/files'
import { canRecognize, canSpeak, isIOSStandalone, speak, turkishVoices, voiceQuality } from '../lib/speech'
import { changePin, lock, update, useV, wipe } from '../lib/store'
import type { AzureVoice, ModelId } from '../lib/types'
import { AzureError, azureAudio, primeAudio, say } from '../lib/voice'
import { useNav } from '../nav'

export function Settings() {
  const v = useV()
  const nav = useNav()
  const [keySheet, setKeySheet] = useState(false)
  const [pinSheet, setPinSheet] = useState(false)
  const [wipeSheet, setWipeSheet] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const setSettings = (patch: Partial<typeof v.settings>) => update((x) => ({ ...x, settings: { ...x.settings, ...patch } }))

  const onImport = async (files: FileList | null) => {
    if (!files?.length) return
    const res = await importMarkdownFiles(files)
    update((x) => ({
      ...x,
      clientFile: res.clientFile ?? x.clientFile,
      clientFileHistory: res.clientFile && x.clientFile ? [{ ts: Date.now(), markdown: x.clientFile }, ...x.clientFileHistory] : x.clientFileHistory,
      reports: mergeReports(x.reports, res.reports),
    }))
    setNotice(`${res.clientFile ? 'Danışan dosyası ve ' : ''}${res.reports.length} rapor aktarıldı.`)
  }

  const onRestore = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    try {
      const data = await readBackup(f)
      update((x) => ({ ...x, ...data, apiKey: x.apiKey, settings: { ...x.settings, ...data.settings } }))
      setNotice('Yedek geri yüklendi.')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Yedek okunamadı.')
    }
  }

  const masked = v.apiKey ? `${v.apiKey.slice(0, 10)}...${v.apiKey.slice(-4)}` : 'Eklenmedi'

  return (
    <Screen title="Ayarlar" onBack={nav.back}>
      {notice && (
        <button onClick={() => setNotice(null)} className="mb-4 w-full rounded-card bg-accent-soft p-3.5 text-left text-[14.5px] text-accent-deep">
          {notice}
        </button>
      )}

      <Group title="Claude">
        <Row icon={<Key size={18} weight="bold" />} title="API anahtarı" sub={masked} onClick={() => setKeySheet(true)} />
        <div className="py-3.5">
          <p className="mb-2 text-[15px]">Varsayılan model</p>
          <Segmented<ModelId>
            value={v.settings.model}
            onChange={(model) => setSettings({ model })}
            options={[
              { value: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
              { value: 'claude-opus-5-5', label: 'Opus 5.5' },
            ]}
          />
          <p className="mt-2 text-[13px] text-muted">Sonnet hızlı ve uygun fiyatlı. Opus daha derin ama yaklaşık iki kat pahalı.</p>
        </div>
      </Group>

      <Group title="Ses">
        <Toggle
          checked={v.settings.readAloud}
          onChange={(readAloud) => setSettings({ readAloud })}
          label="Cevapları sesli oku"
          hint={canSpeak() ? undefined : 'Bu cihazda sesli okuma yok.'}
        />
        <Toggle
          checked={v.settings.inAppSpeech}
          onChange={(inAppSpeech) => setSettings({ inAppSpeech, handsFree: inAppSpeech && v.settings.handsFree })}
          label="Uygulama içi konuşma tanıma"
          hint={
            !canRecognize()
              ? 'Bu cihazda yok. Klavyedeki mikrofon kullanılır.'
              : isIOSStandalone()
                ? 'Deneysel. iPhone ana ekran modunda takılabilir. Kapalıyken klavyedeki mikrofon kullanılır.'
                : 'Kapalıyken klavyedeki mikrofon kullanılır.'
          }
        />
        <Toggle
          checked={v.settings.handsFree && v.settings.inAppSpeech}
          onChange={(handsFree) => setSettings({ handsFree, inAppSpeech: handsFree || v.settings.inAppSpeech })}
          label="Eller serbest"
          hint={canRecognize() ? 'Sustuğunda mesaj gönderilir, cevap okunur, sonra yine dinlenir.' : 'Bu cihazda konuşma tanıma yok.'}
        />
        <div className="py-3.5">
          <p className="mb-2 text-[15px]">Okuma hızı</p>
          <Segmented<string>
            value={String(v.settings.speechRate)}
            onChange={(r) => setSettings({ speechRate: Number(r) })}
            options={[
              { value: '0.85', label: 'Yavaş' },
              { value: '1', label: 'Normal' },
              { value: '1.15', label: 'Hızlı' },
            ]}
          />
        </div>
        <VoiceEngine />
      </Group>

      <Group title="Veriler">
        <label className="flex w-full cursor-pointer items-center gap-3 py-3.5">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
            <FileArrowUp size={18} weight="bold" />
          </span>
          <span className="flex-1">
            <span className="block text-[16px]">Bilgisayardan dosya aktar</span>
            <span className="block text-[13.5px] text-muted">Danisan_Dosyasi.md ve Seans_XX_Rapor.md</span>
          </span>
          <input type="file" accept=".md,text/markdown,text/plain" multiple hidden onChange={(e) => void onImport(e.target.files)} />
        </label>
        <Row
          icon={<Export size={18} weight="bold" />}
          title="Bilgisayara gönder"
          sub="Dosya ve raporları Markdown olarak paylaş"
          onClick={() => void exportMarkdown(v)}
        />
        <Row icon={<DownloadSimple size={18} weight="bold" />} title="Yedek al" sub="Her şey tek dosyada (API anahtarı hariç)" onClick={() => void exportBackup(v)} />
        <label className="flex w-full cursor-pointer items-center gap-3 py-3.5">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
            <UploadSimple size={18} weight="bold" />
          </span>
          <span className="flex-1">
            <span className="block text-[16px]">Yedeği geri yükle</span>
            <span className="block text-[13.5px] text-muted">Mevcut verilerin yerine geçer</span>
          </span>
          <input type="file" accept=".json,application/json" hidden onChange={(e) => void onRestore(e.target.files)} />
        </label>
      </Group>

      <Group title="Güvenlik">
        <Row icon={<Password size={18} weight="bold" />} title="PIN kodunu değiştir" onClick={() => setPinSheet(true)} />
        <Row icon={<LockKey size={18} weight="bold" />} title="Şimdi kilitle" onClick={lock} />
        <Row icon={<Trash size={18} weight="bold" />} title="Tüm verileri sil" onClick={() => setWipeSheet(true)} />
      </Group>

      <p className="px-1 text-[13px] leading-relaxed text-muted">
        Verilerin sadece bu cihazda, PIN kodunla şifreli durur. Seans sırasında mesajlar doğrudan Anthropic'e gönderilir. Bu uygulama lisanslı
        bir terapistin yerini tutmaz.
      </p>

      <KeySheet open={keySheet} onClose={() => setKeySheet(false)} />
      <PinSheet open={pinSheet} onClose={() => setPinSheet(false)} onDone={() => setNotice('PIN kodu değiştirildi.')} />
      <Sheet open={wipeSheet} onClose={() => setWipeSheet(false)} title="Tüm veriler silinsin mi?">
        <p className="text-[15.5px] leading-relaxed text-muted">
          Seanslar, raporlar, günlük ve API anahtarı bu telefondan kalıcı olarak silinir. Geri alınamaz. Önce yedek almanı öneririm.
        </p>
        <div className="mt-6 mb-2 space-y-2">
          <Button variant="secondary" size="lg" className="w-full" onClick={() => void exportBackup(v)}>
            Önce yedek al
          </Button>
          <Button variant="danger" size="lg" className="w-full" onClick={() => void wipe()}>
            Kalıcı olarak sil
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}

function KeySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const v = useV()
  const [key, setKey] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'error'>('idle')
  const [error, setError] = useState('')
  useEffect(() => {
    if (open) {
      setKey('')
      setState('idle')
    }
  }, [open])

  const save = async () => {
    setState('checking')
    try {
      await checkKey(key.trim())
      update((x) => ({ ...x, apiKey: key.trim() }))
      onClose()
    } catch (e) {
      setState('error')
      setError(describeError(e))
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="API anahtarı">
      <Field label="Yeni anahtar" hint={v.apiKey ? 'Kaydedince eskisinin yerine geçer.' : 'console.anthropic.com > API Keys'}>
        <input
          className={inputClass}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </Field>
      {state === 'error' && <p className="-mt-2 mb-3 text-[14px] text-danger">{error}</p>}
      <Button size="lg" className="mb-2 w-full" disabled={!key.trim().startsWith('sk-') || state === 'checking'} onClick={save}>
        {state === 'checking' ? 'Kontrol ediliyor…' : 'Kaydet'}
      </Button>
    </Sheet>
  )
}

function PinSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setA('')
      setB('')
      setErr(null)
    }
  }, [open])
  useEffect(() => {
    if (b.length !== PIN_LENGTH) return
    if (a === b) {
      void changePin(a).then(() => {
        onClose()
        onDone()
      })
    } else {
      setErr('Eşleşmedi. Baştan dene.')
      setA('')
      setB('')
    }
  }, [a, b, onClose, onDone])
  const second = a.length === PIN_LENGTH
  return (
    <Sheet open={open} onClose={onClose} title="PIN kodunu değiştir">
      <div className="py-4">
        <PinPad
          title={second ? 'Tekrarla' : 'Yeni PIN'}
          value={second ? b : a}
          onChange={(x) => {
            setErr(null)
            if (second) setB(x)
            else setA(x)
          }}
          error={err}
        />
      </div>
    </Sheet>
  )
}

const SAMPLE = 'Merhaba. Bugün nasılsın? Hazır olduğunda başlayabiliriz.'

function VoicePicker() {
  const v = useV()
  const [voices, setVoices] = useState(turkishVoices)
  useEffect(() => {
    if (!canSpeak()) return
    const load = () => setVoices(turkishVoices())
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])
  const current = voices.find((x) => x.voiceURI === v.settings.voiceURI) ?? voices[0]
  const choose = (uri: string) => {
    update((x) => ({ ...x, settings: { ...x.settings, voiceURI: uri } }))
    void speak(SAMPLE, v.settings.speechRate, uri)
  }
  const hasEnhanced = voices.some((x) => voiceQuality(x) === 'Gelişmiş')
  return (
    <div className="py-3.5">
      <p className="mb-1 text-[15px]">Ses</p>
      <p className="mb-2 text-[13px] text-muted">Dokununca seçilir ve örnek cümleyi okur.</p>
      {voices.length === 0 ? (
        <p className="text-[14px] text-muted">Bu cihazda Türkçe ses bulunamadı.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {voices.map((x) => (
            <button
              key={x.voiceURI}
              onClick={() => choose(x.voiceURI)}
              className="flex items-center justify-between rounded-field bg-surface-2 px-3.5 py-2.5 text-left active:opacity-70"
            >
              <span>
                <span className="block text-[15px]">{x.name}</span>
                <span className="block text-[12.5px] text-muted">{voiceQuality(x)}</span>
              </span>
              {current?.voiceURI === x.voiceURI && <Check size={18} weight="bold" className="text-accent" />}
            </button>
          ))}
        </div>
      )}
      {!hasEnhanced && (
        <p className="mt-3 rounded-field bg-accent-soft p-3 text-[13.5px] leading-snug text-accent-deep">
          Daha doğal bir ses için iPhone Ayarlar &gt; Erişilebilirlik &gt; Seslendirilen İçerik &gt; Sesler &gt; Türkçe bölümünden
          "Gelişmiş" bir sesi indir. Sonra uygulamayı kapatıp yeniden aç.
        </p>
      )}
    </div>
  )
}

function VoiceEngine() {
  const v = useV()
  const engine = v.settings.tts ?? 'device'
  return (
    <div className="py-3.5">
      <p className="mb-2 text-[15px]">Ses motoru</p>
      <Segmented<'device' | 'azure'>
        value={engine}
        onChange={(tts) => update((x) => ({ ...x, settings: { ...x.settings, tts } }))}
        options={[
          { value: 'device', label: 'iPhone sesi' },
          { value: 'azure', label: 'Azure (doğal)' },
        ]}
      />
      <div className="mt-3">{engine === 'azure' ? <AzureSettings /> : <VoicePicker />}</div>
    </div>
  )
}

const AZURE_VOICES: { value: AzureVoice; label: string }[] = [
  { value: 'tr-TR-EmelNeural', label: 'Emel (kadın)' },
  { value: 'tr-TR-AhmetNeural', label: 'Ahmet (erkek)' },
]

function AzureSettings() {
  const v = useV()
  const [key, setKey] = useState('')
  const [region, setRegion] = useState(v.settings.azureRegion ?? '')
  const [state, setState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')
  const voice = v.settings.azureVoice ?? 'tr-TR-EmelNeural'
  const saved = !!v.settings.azureKey

  const test = async () => {
    primeAudio()
    setState('testing')
    const k = key.trim() || v.settings.azureKey || ''
    const r = region.trim().toLowerCase().replace(/\s+/g, '')
    try {
      await azureAudio('Merhaba.', { key: k, region: r, voice, rate: 1 })
      update((x) => ({ ...x, settings: { ...x.settings, azureKey: k, azureRegion: r } }))
      setKey('')
      setState('ok')
      void say(SAMPLE, { ...v.settings, tts: 'azure', azureKey: k, azureRegion: r })
    } catch (e) {
      setState('error')
      setError(e instanceof AzureError ? e.message : 'Bağlanılamadı.')
    }
  }

  const setVoice = (azureVoice: AzureVoice) => {
    update((x) => ({ ...x, settings: { ...x.settings, azureVoice } }))
    if (saved) {
      primeAudio()
      void say(SAMPLE, { ...v.settings, azureVoice })
    }
  }

  return (
    <div>
      <Segmented<AzureVoice> value={voice} onChange={setVoice} options={AZURE_VOICES} />
      <div className="mt-4">
        <Field label="Azure anahtarı" hint={saved ? 'Kayıtlı. Değiştirmek için yenisini yaz.' : 'Azure Portal > Speech kaynağın > Keys and Endpoint > KEY 1'}>
          <input
            className={inputClass}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={saved ? '••••••••' : 'Anahtarı yapıştır'}
            type="password"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Bölge (Location/Region)" hint="Aynı sayfada yazar. Örneğin: westeurope">
          <input
            className={inputClass}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="westeurope"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
      </div>
      {state === 'error' && <p className="-mt-2 mb-3 text-[14px] text-danger">{error}</p>}
      {state === 'ok' && <p className="-mt-2 mb-3 text-[14px] text-accent">Bağlandı. Örnek cümle okunuyor.</p>}
      <Button
        variant="secondary"
        className="w-full"
        disabled={state === 'testing' || !region.trim() || (!key.trim() && !saved)}
        onClick={test}
      >
        {state === 'testing' ? 'Deneniyor…' : saved ? 'Kaydet ve dinle' : 'Bağlan ve dinle'}
      </Button>
      <p className="mt-3 text-[13px] leading-snug text-muted">
        Azure seçiliyken danışmanın cevapları okunmak için Microsoft'a gönderilir. Senin mesajların gönderilmez. Azure'a ulaşılamazsa iPhone sesi kullanılır.
      </p>
    </div>
  )
}
