import { ArrowRight, CheckCircle, Export, FileArrowUp, Key, LockKey, PlusSquare } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { PIN_LENGTH, PinPad } from '../components/PinPad'
import { Button, Field, Segmented, inputClass } from '../components/ui'
import { checkKey, describeError } from '../lib/claude'
import { importMarkdownFiles, isBackupFile, mergeReports, readBackup } from '../lib/files'
import { createVault } from '../lib/store'
import { newVault, type Report, type Vault } from '../lib/types'
import { setLang, t, useLang, type Lang } from '../lib/i18n'

type Step = 'install' | 'welcome' | 'pin' | 'pin2' | 'key' | 'import'

const isStandalone = () =>
  (navigator as unknown as { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function Onboarding() {
  const lang = useLang()
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
  const [backup, setBackup] = useState<Partial<Vault> | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    if (step === 'pin' && pin.length === PIN_LENGTH) setTimeout(() => setStep('pin2'), 150)
  }, [pin, step])

  useEffect(() => {
    if (step !== 'pin2' || pin2.length !== PIN_LENGTH) return
    if (pin2 === pin) setTimeout(() => setStep('key'), 150)
    else {
      setPinError(t('pinMismatch'))
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
    setFileError(null)
    const list = Array.from(files)
    const json = list.find(isBackupFile)
    if (json) {
      try {
        const data = await readBackup(json)
        setBackup(data)
        if (data.clientFile) setClientFile(data.clientFile)
        if (data.reports) setReports(data.reports)
      } catch (e) {
        setFileError(e instanceof Error ? e.message : t('restoreFailed'))
      }
    }
    const res = await importMarkdownFiles(list.filter((f) => !isBackupFile(f)))
    if (res.clientFile) setClientFile(res.clientFile)
    setReports((r) => mergeReports(r, res.reports))
  }

  const finish = async () => {
    setSaving(true)
    const base = newVault()
    await createVault(
      pin,
      backup
        ? { ...base, ...backup, apiKey: apiKey.trim(), settings: { ...base.settings, ...backup.settings }, profileSkipped: true }
        : { ...base, apiKey: apiKey.trim(), clientFile, reports },
    )
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
              title={t('installTitle')}
              text={t('installText')}
            >
              <ol className="mt-6 space-y-3 text-[16px]">
                <InstallStep n="1">
                  {t('installStep1')} <Export size={20} className="mx-1 inline -translate-y-0.5 text-accent" />
                </InstallStep>
                <InstallStep n="2">{t('installStep2')}</InstallStep>
                <InstallStep n="3">{t('installStep3')}</InstallStep>
              </ol>
              <div className="mt-auto pt-8">
                <Button variant="secondary" size="lg" className="w-full" onClick={() => setStep('welcome')}>
                  {t('installContinue')}
                </Button>
              </div>
            </Intro>
          )}

          {step === 'welcome' && (
            <Intro
              icon={<LockKey size={30} weight="duotone" />}
              title={t('appName')}
              text={t('welcomeText')}
            >
              <div className="mt-6">
                <Segmented<Lang>
                  value={lang}
                  onChange={setLang}
                  options={[
                    { value: 'tr', label: 'Türkçe' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </div>
              <p className="mt-4 rounded-card bg-surface p-4 text-[14.5px] leading-relaxed text-muted shadow-card">
                {t('disclaimer')}
              </p>
              <div className="mt-auto pt-8">
                <Button size="lg" className="w-full" onClick={() => setStep('pin')}>
                  {t('start')} <ArrowRight size={18} weight="bold" />
                </Button>
              </div>
            </Intro>
          )}

          {step === 'pin' && (
            <div className="flex flex-1 flex-col justify-center">
              <PinPad
                title={t('setPin')}
                sub={t('setPinSub')}
                value={pin}
                onChange={(v) => {
                  setPinError(null)
                  setPin(v)
                }}
                error={pinError}
              />
              <p className="mt-8 text-center text-[13px] text-muted">{t('pinWarning')}</p>
            </div>
          )}

          {step === 'pin2' && (
            <div className="flex flex-1 flex-col justify-center">
              <PinPad title={t('repeatPin')} sub={t('repeatPinSub')} value={pin2} onChange={setPin2} />
            </div>
          )}

          {step === 'key' && (
            <Intro
              icon={<Key size={30} weight="duotone" />}
              title={t('keyTitle')}
              text={t('keyText')}
            >
              <div className="mt-6">
                <Field label={t('keyLabel')} hint={t('keyHint')}>
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
                  {keyState === 'checking' ? t('checking') : keyState === 'ok' ? <><CheckCircle size={20} weight="fill" /> {t('connected')}</> : t('connect')}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('import')}>
                  {t('later')}
                </Button>
              </div>
            </Intro>
          )}

          {step === 'import' && (
            <Intro
              icon={<FileArrowUp size={30} weight="duotone" />}
              title={t('importTitle')}
              text={t('importText')}
            >
              <label className="mt-6 flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-accent-soft text-[16px] font-medium text-accent-deep active:scale-[0.98]">
                <FileArrowUp size={20} weight="bold" />
                {t('chooseFiles')}
                <input type="file" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
              </label>
              <div className="mt-5 space-y-2">
                {backup && <Imported ok text={t('backupFound')} />}
                {fileError && <p className="text-[14px] text-danger">{fileError}</p>}
                <Imported ok={!!clientFile} text={t('clientFile')} />
                <Imported ok={reports.length > 0} text={reports.length ? t('reportsCount', { n: reports.length }) : t('sessionReports')} />
              </div>
              <p className="mt-5 text-[13.5px] leading-relaxed text-muted">
                {t('importHelp')}
              </p>
              <div className="mt-auto pt-8">
                <Button size="lg" className="w-full" disabled={saving} onClick={finish}>
                  {saving ? t('encrypting') : backup || clientFile || reports.length ? t('finish') : t('startEmpty')}
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
