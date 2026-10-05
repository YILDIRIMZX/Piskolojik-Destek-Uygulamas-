import { AZURE_VOICES, getLang, t } from './i18n'
import { plain, speak, stopSpeaking } from './speech'
import type { AzureVoice, Settings } from './types'

// One shared <audio> element. iOS only lets a page play audio after a user gesture has "unlocked" it,
// so primeAudio() is called from taps (send, mic, read-aloud) before any async playback.
let audio: HTMLAudioElement | null = null
let currentUrl: string | null = null
/** 0.1 s of silent 8 kHz mono WAV, built at runtime. */
const SILENCE = (() => {
  const n = 800
  const buf = new DataView(new ArrayBuffer(44 + n))
  const str = (o: number, t: string) => [...t].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); buf.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ')
  buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true)
  buf.setUint32(24, 8000, true); buf.setUint32(28, 8000, true); buf.setUint16(32, 1, true); buf.setUint16(34, 8, true)
  str(36, 'data'); buf.setUint32(40, n, true)
  for (let i = 0; i < n; i++) buf.setUint8(44 + i, 128)
  let bin = ''
  new Uint8Array(buf.buffer).forEach((b) => (bin += String.fromCharCode(b)))
  return `data:audio/wav;base64,${btoa(bin)}`
})()

const el = () => (audio ??= new Audio())

export function primeAudio() {
  const a = el()
  if (a.src && !a.paused) return
  a.src = SILENCE
  a.play().catch(() => {})
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const ratePercent = (rate: number) => `${Math.round((rate - 1) * 100)}%`

export class AzureError extends Error {}

export async function azureAudio(text: string, o: { key: string; region: string; voice: AzureVoice; rate: number }) {
  const ssml = `<speak version="1.0" xml:lang="${o.voice.slice(0, 5)}"><voice name="${o.voice}"><prosody rate="${ratePercent(o.rate)}">${escapeXml(plain(text))}</prosody></voice></speak>`
  let res: Response
  try {
    res = await fetch(`https://${o.region.trim()}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': o.key.trim(),
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: ssml,
    })
  } catch {
    throw new AzureError(t('errAzureConnect'))
  }
  if (res.status === 401) throw new AzureError(t('errAzureKey'))
  if (res.status === 429) throw new AzureError(t('errAzureQuota'))
  if (!res.ok) throw new AzureError(t('errAzure', { n: res.status }))
  return res.blob()
}

function play(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const a = el()
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    currentUrl = URL.createObjectURL(blob)
    a.onended = a.onerror = a.onpause = () => resolve()
    a.src = currentUrl
    a.play().catch(() => resolve())
  })
}

/** The chosen Azure voice if it matches the app language, otherwise that language's first voice. */
export function azureVoiceFor(s: Settings): AzureVoice {
  const voices = AZURE_VOICES[getLang()]
  return voices.find((v) => v.value === s.azureVoice)?.value ?? voices[0].value
}

export const azureReady = (s: Settings) => s.tts === 'azure' && !!s.azureKey && !!s.azureRegion

/** Reads text aloud with the chosen engine. Falls back to the device voice if Azure fails. */
export async function say(text: string, s: Settings): Promise<void> {
  if (azureReady(s)) {
    try {
      const blob = await azureAudio(text, { key: s.azureKey!, region: s.azureRegion!, voice: azureVoiceFor(s), rate: s.speechRate })
      return await play(blob)
    } catch {
      /* fall through to the device voice */
    }
  }
  return speak(text, s.speechRate, s.voiceURI)
}

export function stopAll() {
  stopSpeaking()
  if (audio && !audio.paused) audio.pause()
}
