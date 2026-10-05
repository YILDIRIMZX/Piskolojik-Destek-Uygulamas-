import { Check, DownloadSimple, Export, FileArrowUp, Key, LockKey, Password, Trash, UploadSimple } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { PIN_LENGTH, PinPad } from '../components/PinPad'
import { Button, Field, Group, Row, Screen, Segmented, Sheet, Toggle, inputClass } from '../components/ui'
import { checkKey, describeError } from '../lib/claude'
import { exportBackup, exportMarkdown, importMarkdownFiles, mergeReports, readBackup } from '../lib/files'
import { AZURE_VOICES, setLang, t, useLang, type Lang } from '../lib/i18n'
import { canRecognize, canSpeak, isEnhancedVoice, isIOSStandalone, langVoices, speak } from '../lib/speech'
import { changePin, lock, update, useV, wipe } from '../lib/store'
import type { AzureVoice, ModelId } from '../lib/types'
import { AzureError, azureAudio, azureVoiceFor, primeAudio, say } from '../lib/voice'
import { useNav } from '../nav'

export function Settings() {
  const v = useV()
  const nav = useNav()
  const lang = useLang()
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
    setNotice(t('imported', { file: res.clientFile ? t('importedClient') : '', n: res.reports.length }))
  }

  const onRestore = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    try {
      const data = await readBackup(f)
      update((x) => ({ ...x, ...data, apiKey: x.apiKey, settings: { ...x.settings, ...data.settings, azureKey: x.settings.azureKey } }))
      setNotice(t('restored'))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t('restoreFailed'))
    }
  }

  const masked = v.apiKey ? `${v.apiKey.slice(0, 10)}…${v.apiKey.slice(-4)}` : t('notAdded')

  return (
    <Screen title={t('settings')} onBack={nav.back}>
      {notice && (
        <button onClick={() => setNotice(null)} className="mb-4 w-full rounded-card bg-accent-soft p-3.5 text-left text-[14.5px] text-accent-deep">
          {notice}
        </button>
      )}

      <Group title={t('language')}>
        <div className="py-3.5">
          <Segmented<Lang>
            value={lang}
            onChange={setLang}
            options={[
              { value: 'tr', label: 'Türkçe' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
      </Group>

      <Group title="Claude">
        <Row icon={<Key size={18} weight="bold" />} title={t('apiKey')} sub={masked} onClick={() => setKeySheet(true)} />
        <div className="py-3.5">
          <p className="mb-2 text-[15px]">{t('defaultModel')}</p>
          <Segmented<ModelId>
            value={v.settings.model}
            onChange={(model) => setSettings({ model })}
            options={[
              { value: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
              { value: 'claude-opus-5-5', label: 'Opus 5.5' },
            ]}
          />
          <p className="mt-2 text-[13px] text-muted">{t('modelHint')}</p>
        </div>
      </Group>

      <Group title={t('voice')}>
        <Toggle
          checked={v.settings.readAloud}
          onChange={(readAloud) => setSettings({ readAloud })}
          label={t('readAloudToggle')}
          hint={canSpeak() ? undefined : t('noTtsDevice')}
        />
        <Toggle
          checked={v.settings.inAppSpeech}
          onChange={(inAppSpeech) => setSettings({ inAppSpeech, handsFree: inAppSpeech && v.settings.handsFree })}
          label={t('inAppSpeech')}
          hint={!canRecognize() ? t('inAppNone') : isIOSStandalone() ? t('inAppIos') : t('inAppOther')}
        />
        <Toggle
          checked={v.settings.handsFree && v.settings.inAppSpeech}
          onChange={(handsFree) => setSettings({ handsFree, inAppSpeech: handsFree || v.settings.inAppSpeech })}
          label={t('handsFree')}
          hint={canRecognize() ? t('handsFreeHintSettings') : t('noRecognition')}
        />
        <div className="py-3.5">
          <p className="mb-2 text-[15px]">{t('speechRate')}</p>
          <Segmented<string>
            value={String(v.settings.speechRate)}
            onChange={(r) => setSettings({ speechRate: Number(r) })}
            options={[
              { value: '0.85', label: t('slow') },
              { value: '1', label: t('normal') },
              { value: '1.15', label: t('fast') },
            ]}
          />
        </div>
        <VoiceEngine />
      </Group>

      <Group title={t('data')}>
        <label className="flex w-full cursor-pointer items-center gap-3 py-3.5">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
            <FileArrowUp size={18} weight="bold" />
          </span>
          <span className="flex-1">
            <span className="block text-[16px]">{t('importFiles')}</span>
            <span className="block text-[13.5px] text-muted">{t('importFilesSub')}</span>
          </span>
          <input type="file" accept=".md,text/markdown,text/plain" multiple hidden onChange={(e) => void onImport(e.target.files)} />
        </label>
        <Row icon={<Export size={18} weight="bold" />} title={t('exportFiles')} sub={t('exportFilesSub')} onClick={() => void exportMarkdown(v)} />
        <Row icon={<DownloadSimple size={18} weight="bold" />} title={t('backup')} sub={t('backupSub')} onClick={() => void exportBackup(v)} />
        <label className="flex w-full cursor-pointer items-center gap-3 py-3.5">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
            <UploadSimple size={18} weight="bold" />
          </span>
          <span className="flex-1">
            <span className="block text-[16px]">{t('restore')}</span>
            <span className="block text-[13.5px] text-muted">{t('restoreSub')}</span>
          </span>
          <input type="file" accept=".json,application/json" hidden onChange={(e) => void onRestore(e.target.files)} />
        </label>
      </Group>

      <Group title={t('security')}>
        <Row icon={<Password size={18} weight="bold" />} title={t('changePin')} onClick={() => setPinSheet(true)} />
        <Row icon={<LockKey size={18} weight="bold" />} title={t('lockNow')} onClick={lock} />
        <Row icon={<Trash size={18} weight="bold" />} title={t('wipeAll')} onClick={() => setWipeSheet(true)} />
      </Group>

      <p className="px-1 text-[13px] leading-relaxed text-muted">{t('privacyNote')}</p>

      <KeySheet open={keySheet} onClose={() => setKeySheet(false)} />
      <PinSheet open={pinSheet} onClose={() => setPinSheet(false)} onDone={() => setNotice(t('pinChanged'))} />
      <Sheet open={wipeSheet} onClose={() => setWipeSheet(false)} title={t('wipeTitle')}>
        <p className="text-[15.5px] leading-relaxed text-muted">{t('wipeText')}</p>
        <div className="mt-6 mb-2 space-y-2">
          <Button variant="secondary" size="lg" className="w-full" onClick={() => void exportBackup(v)}>
            {t('backupFirst')}
          </Button>
          <Button variant="danger" size="lg" className="w-full" onClick={() => void wipe()}>
            {t('wipeForever')}
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
    <Sheet open={open} onClose={onClose} title={t('apiKey')}>
      <Field label={t('newKey')} hint={v.apiKey ? t('newKeyReplace') : 'console.anthropic.com > API Keys'}>
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
        {state === 'checking' ? t('checking') : t('save')}
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
      setErr(t('pinNoMatch'))
      setA('')
      setB('')
    }
  }, [a, b, onClose, onDone])
  const second = a.length === PIN_LENGTH
  return (
    <Sheet open={open} onClose={onClose} title={t('changePin')}>
      <div className="py-4">
        <PinPad
          title={second ? t('pinRepeat') : t('pinNew')}
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

function VoicePicker() {
  const v = useV()
  const lang = useLang()
  const [voices, setVoices] = useState(langVoices)
  useEffect(() => {
    setVoices(langVoices())
    if (!canSpeak()) return
    const load = () => setVoices(langVoices())
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [lang])
  const current = voices.find((x) => x.voiceURI === v.settings.voiceURI) ?? voices[0]
  const choose = (uri: string) => {
    update((x) => ({ ...x, settings: { ...x.settings, voiceURI: uri } }))
    void speak(t('sample'), v.settings.speechRate, uri)
  }
  const hasEnhanced = voices.some(isEnhancedVoice)
  return (
    <div>
      <p className="mb-2 text-[13px] text-muted">{t('voiceTapHint')}</p>
      {voices.length === 0 ? (
        <p className="text-[14px] text-muted">{t('noVoices')}</p>
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
                <span className="block text-[12.5px] text-muted">{isEnhancedVoice(x) ? t('enhanced') : t('standard')}</span>
              </span>
              {current?.voiceURI === x.voiceURI && <Check size={18} weight="bold" className="text-accent" />}
            </button>
          ))}
        </div>
      )}
      {!hasEnhanced && <p className="mt-3 rounded-field bg-accent-soft p-3 text-[13.5px] leading-snug text-accent-deep">{t('enhancedHelp')}</p>}
    </div>
  )
}

function VoiceEngine() {
  const v = useV()
  const engine = v.settings.tts ?? 'device'
  return (
    <div className="py-3.5">
      <p className="mb-2 text-[15px]">{t('voiceEngine')}</p>
      <Segmented<'device' | 'azure'>
        value={engine}
        onChange={(tts) => update((x) => ({ ...x, settings: { ...x.settings, tts } }))}
        options={[
          { value: 'device', label: t('deviceVoice') },
          { value: 'azure', label: t('azureVoice') },
        ]}
      />
      <div className="mt-3">{engine === 'azure' ? <AzureSettings /> : <VoicePicker />}</div>
    </div>
  )
}

function AzureSettings() {
  const v = useV()
  const lang = useLang()
  const [key, setKey] = useState('')
  const [region, setRegion] = useState(v.settings.azureRegion ?? '')
  const [state, setState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')
  const voice = azureVoiceFor(v.settings)
  const saved = !!v.settings.azureKey

  const test = async () => {
    primeAudio()
    setState('testing')
    const k = key.trim() || v.settings.azureKey || ''
    const r = region.trim().toLowerCase().replace(/\s+/g, '')
    try {
      await azureAudio('OK.', { key: k, region: r, voice, rate: 1 })
      update((x) => ({ ...x, settings: { ...x.settings, azureKey: k, azureRegion: r } }))
      setKey('')
      setState('ok')
      void say(t('sample'), { ...v.settings, tts: 'azure', azureKey: k, azureRegion: r })
    } catch (e) {
      setState('error')
      setError(e instanceof AzureError ? e.message : t('azureConnectFail'))
    }
  }

  const setVoice = (azureVoice: AzureVoice) => {
    update((x) => ({ ...x, settings: { ...x.settings, azureVoice } }))
    if (saved) {
      primeAudio()
      void say(t('sample'), { ...v.settings, azureVoice })
    }
  }

  return (
    <div>
      <Segmented<AzureVoice>
        value={voice}
        onChange={setVoice}
        options={AZURE_VOICES[lang].map((x) => ({ value: x.value, label: `${x.name} (${t(x.gender)})` }))}
      />
      <div className="mt-4">
        <Field label={t('azureKey')} hint={saved ? t('azureKeySaved') : t('azureKeyHint')}>
          <input
            className={inputClass}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={saved ? '••••••••' : t('pasteKey')}
            type="password"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
        <Field label={t('region')} hint={t('regionHint')}>
          <input
            className={inputClass}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="northeurope"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
      </div>
      {state === 'error' && <p className="-mt-2 mb-3 text-[14px] text-danger">{error}</p>}
      {state === 'ok' && <p className="-mt-2 mb-3 text-[14px] text-accent">{t('azureOk')}</p>}
      <Button variant="secondary" className="w-full" disabled={state === 'testing' || !region.trim() || (!key.trim() && !saved)} onClick={test}>
        {state === 'testing' ? t('testing') : saved ? t('saveListen') : t('connectListen')}
      </Button>
      <p className="mt-3 text-[13px] leading-snug text-muted">{t('azureNote')}</p>
    </div>
  )
}
