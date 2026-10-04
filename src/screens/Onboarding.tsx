import { ArrowRight, CheckCircle, Export, FileArrowUp, Key, LockKey, PlusSquare } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { PIN_LENGTH, PinPad } from '../components/PinPad'
import { Button, Field, inputClass } from '../components/ui'
import { checkKey, describeError } from '../lib/claude'
import { importMarkdownFiles, mergeReports } from '../lib/files'
import { createVault } from '../lib/store'
import { newVault, type Report } from '../lib/types'

type Step = 'install' | 'welcome' | 'pin' | 'pin2' | 'key' | 'import'

const isStandalone = () =>
  (navigator as unknown as { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function Onboarding() {
  const [step, setStep] = useState<Step>(isIOS() && !isStandalone() ? 'install' : 'welcome')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [keyState, setKeyState] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [keyError, setKeyError] = useState('')
  const [clientFile, setClientFile] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (step === 'pin' && pin.length === PIN_LENGTH) setTimeout(() => setStep('pin2'), 150)
  }, [pin, step])

  useEffect(() => {
    if (step !== 'pin2' || pin2.length !== PIN_LENGTH) return
    if (pin2 === pin) setTimeout(() => setStep('key'), 150)
    else {
      setPinError('PIN kodları eşleşmedi. Baştan dene.')
      setPin('')
      setPin2('')
      setStep('pin')
    }
  }, [pin2, pin, step])

  const verifyKey = async () => {
    setKeyState('checking')
    try {
      await checkKey(apiKey.trim())
      setKeyState('ok')
      setTimeout(() => setStep('import'), 500)
    } catch (e) {
      setKeyState('error')
      setKeyError(describeError(e))
    }
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const res = await importMarkdownFiles(files)
    if (res.clientFile) setClientFile(res.clientFile)
    setReports((r) => mergeReports(r, res.reports))
  }

  const finish = async () => {
    setSaving(true)
    await createVault(pin, { ...newVault(), apiKey: apiKey.trim(), clientFile, reports })
  }

  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-[100dvh] max-w-md flex-col px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 flex-col"
        >
          {step === 'install' && (
            <Intro
              icon={<PlusSquare size={30} weight="duotone" />}
              title="Önce ana ekrana ekle"
              text="Uygulama, ana ekrandan açıldığında tam ekran çalışır. Safari'deki veriler ana ekrandaki uygulamaya taşınmaz, bu yüzden kurulumu orada yap."
            >
              <ol className="mt-6 space-y-3 text-[16px]">
                <InstallStep n="1">
                  Alttaki <Export size={20} className="mx-1 inline -translate-y-0.5 text-accent" /> Paylaş düğmesine dokun
                </InstallStep>
                <InstallStep n="2">"Ana Ekrana Ekle"yi seç</InstallStep>
                <InstallStep n="3">Ana ekrandaki Seans simgesinden aç</InstallStep>
              </ol>
              <div className="mt-auto pt-8">
                <Button variant="secondary" size="lg" className="w-full" onClick={() => setStep('welcome')}>
                  Safari'de devam et
                </Button>
              </div>
            </Intro>
          )}

          {step === 'welcome' && (
            <Intro
              icon={<LockKey size={30} weight="duotone" />}
              title="Seans"
              text="Seanslarına, günlüğüne ve raporlarına telefonundan ulaş. Her şey bu cihazda, senin PIN kodunla şifreli durur."
            >
              <p className="mt-6 rounded-card bg-surface p-4 text-[14.5px] leading-relaxed text-muted shadow-card">
                Bu uygulama lisanslı bir terapistin yerini tutmaz. Seanslar arasında bir destek aracıdır. Acil bir durumda 112'yi ara.
              </p>
              <div className="mt-auto pt-8">
                <Button size="lg" className="w-full" onClick={() => setStep('pin')}>
                  Başla <ArrowRight size={18} weight="bold" />
                </Button>
              </div>
            </Intro>
          )}

          {step === 'pin' && (
            <div className="flex flex-1 flex-col justify-center">
              <PinPad
                title="PIN kodu belirle"
                sub="6 haneli. Verilerin bununla şifrelenir."
                value={pin}
                onChange={(v) => {
                  setPinError(null)
                  setPin(v)
                }}
                error={pinError}
              />
              <p className="mt-8 text-center text-[13px] text-muted">PIN'i unutursan veriler kurtarılamaz. Düzenli yedek al.</p>
            </div>
          )}

          {step === 'pin2' && (
            <div className="flex flex-1 flex-col justify-center">
              <PinPad title="PIN kodunu tekrarla" sub="Aynı 6 haneyi gir" value={pin2} onChange={setPin2} />
            </div>
          )}

          {step === 'key' && (
            <Intro
              icon={<Key size={30} weight="duotone" />}
              title="Claude API anahtarı"
              text="Seanslar için Claude'a bu anahtarla bağlanılır. Anahtar sadece bu telefonda, şifreli saklanır."
            >
              <div className="mt-6">
                <Field label="API anahtarı" hint="console.anthropic.com > API Keys bölümünden kopyala.">
                  <input
                    className={inputClass}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setKeyState('idle')
                    }}
                    placeholder="sk-ant-..."
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    type="password"
                  />
                </Field>
                {keyState === 'error' && <p className="-mt-2 mb-3 text-[14px] text-danger">{keyError}</p>}
              </div>
              <div className="mt-auto space-y-2 pt-8">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!apiKey.trim().startsWith('sk-') || keyState === 'checking'}
                  onClick={verifyKey}
                >
                  {keyState === 'checking' ? 'Kontrol ediliyor…' : keyState === 'ok' ? <><CheckCircle size={20} weight="fill" /> Bağlandı</> : 'Bağlan'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('import')}>
                  Sonra ekle
                </Button>
              </div>
            </Intro>
          )}

          {step === 'import' && (
            <Intro
              icon={<FileArrowUp size={30} weight="duotone" />}
              title="Dosyalarını aktar"
              text="Bilgisayardaki seanslardan devam etmek için Danisan_Dosyasi.md ve Seans_XX_Rapor.md dosyalarını seç."
            >
              <label className="mt-6 flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-accent-soft text-[16px] font-medium text-accent-deep active:scale-[0.98]">
                <FileArrowUp size={20} weight="bold" />
                Dosyaları seç
                <input type="file" accept=".md,text/markdown,text/plain" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
              </label>
              <div className="mt-5 space-y-2">
                <Imported ok={!!clientFile} text="Danışan dosyası" />
                <Imported ok={reports.length > 0} text={reports.length ? `${reports.length} seans raporu` : 'Seans raporları'} />
              </div>
              <p className="mt-5 text-[13.5px] leading-relaxed text-muted">
                Dosyaları telefona almak için kendine WhatsApp ya da e-posta ile gönderip "Dosyalar"a kaydedebilirsin. Bu adımı atlayıp
                sıfırdan da başlayabilirsin.
              </p>
              <div className="mt-auto pt-8">
                <Button size="lg" className="w-full" disabled={saving} onClick={finish}>
                  {saving ? 'Şifreleniyor…' : clientFile || reports.length ? 'Tamamla' : 'Dosyasız başla'}
                </Button>
              </div>
            </Intro>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Intro({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pt-[12vh]">
      <div className="mb-6 grid size-16 place-items-center rounded-[20px] bg-accent text-accent-ink">{icon}</div>
      <h1 className="text-[32px] leading-[1.1] font-[680] tracking-[-0.03em]">{title}</h1>
      <p className="mt-3 text-[16.5px] leading-relaxed text-muted">{text}</p>
      {children}
    </div>
  )
}

function InstallStep({ n, children }: { n: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent-deep">{n}</span>
      <span>{children}</span>
    </li>
  )
}

function Imported({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[15px]">
      <CheckCircle size={22} weight={ok ? 'fill' : 'regular'} className={ok ? 'text-accent' : 'text-muted/50'} />
      <span className={ok ? '' : 'text-muted'}>{text}</span>
    </div>
  )
}
