// Azure speech-to-text: records microphone audio as 16 kHz WAV and sends it to the Azure
// short-audio REST endpoint. Works in iPhone Home Screen mode, where Safari's own
// recognizer is unreliable. Long speech is split into chunks under the 60 s limit.
import { useCallback, useEffect, useRef, useState } from 'react'
import { speechLang, t } from './i18n'

const TARGET_RATE = 16000
const CHUNK_SECONDS = 45
const SPEECH_RMS = 0.015

let sharedCtx: AudioContext | null = null
const audioContext = () => {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedCtx = new C()
  }
  return sharedCtx
}

export const canRecord = () => !!navigator.mediaDevices?.getUserMedia && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)

function downsample(chunks: Float32Array[], inRate: number): Int16Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const ratio = inRate / TARGET_RATE
  const outLen = Math.floor(total / ratio)
  const out = new Int16Array(outLen)
  const flat = new Float32Array(total)
  let o = 0
  for (const c of chunks) {
    flat.set(c, o)
    o += c.length
  }
  for (let i = 0; i < outLen; i++) {
    // Average the input samples that fall into this output sample.
    const start = Math.floor(i * ratio)
    const end = Math.min(total, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += flat[j]
    const v = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)))
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff
  }
  return out
}

function wav(pcm: Int16Array): Blob {
  const buf = new ArrayBuffer(44 + pcm.length * 2)
  const v = new DataView(buf)
  const str = (off: number, s: string) => [...s].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + pcm.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, TARGET_RATE, true)
  v.setUint32(28, TARGET_RATE * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, pcm.length * 2, true)
  new Int16Array(buf, 44).set(pcm)
  return new Blob([buf], { type: 'audio/wav' })
}

export class SttError extends Error {}

export async function transcribe(audio: Blob, key: string, region: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${speechLang()}&format=simple`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          Accept: 'application/json',
        },
        body: audio,
      },
    )
  } catch {
    throw new SttError(t('errAzureConnect'))
  }
  if (res.status === 401) throw new SttError(t('errAzureKey'))
  if (res.status === 429) throw new SttError(t('errAzureQuota'))
  if (!res.ok) throw new SttError(t('errAzure', { n: res.status }))
  const data = (await res.json()) as { RecognitionStatus?: string; DisplayText?: string }
  return data.RecognitionStatus === 'Success' ? (data.DisplayText ?? '') : ''
}

/**
 * Same interface as useDictation, backed by Azure. Text arrives after each chunk and when recording stops.
 * In hands-free mode, a pause after speech stops recording, transcribes and calls `onPause`.
 */
export function useAzureDictation(opts: {
  onText: (text: string) => void
  onPause?: (text: string) => void
  autoSendAfterMs?: number
  enabled: boolean
  creds: { key: string; region: string } | null
}) {
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const optsRef = useRef(opts)
  optsRef.current = opts
  const live = useRef<{
    stream: MediaStream
    node: ScriptProcessorNode
    source: MediaStreamAudioSourceNode
    chunks: Float32Array[]
    seconds: number
    rate: number
    heardSpeech: boolean
    silentMs: number
  } | null>(null)
  const base = useRef('')
  const parts = useRef<Promise<string>[]>([])

  const compose = async () => {
    const texts = await Promise.all(parts.current)
    return (base.current + texts.filter(Boolean).join(' ')).replace(/\s+/g, ' ').trimStart()
  }

  const sendChunk = (chunks: Float32Array[], rate: number) => {
    const c = optsRef.current.creds
    if (!c || !chunks.length) return
    const p = transcribe(wav(downsample(chunks, rate)), c.key, c.region).catch((e: unknown) => {
      setError(e instanceof SttError ? e.message : t('errNotUnderstood'))
      return ''
    })
    parts.current.push(p)
    setTranscribing((n) => n + 1)
    void p.finally(() => setTranscribing((n) => n - 1))
    void compose().then((text) => optsRef.current.onText(text))
  }

  const teardown = () => {
    const l = live.current
    live.current = null
    if (!l) return null
    l.node.disconnect()
    l.source.disconnect()
    l.node.onaudioprocess = null
    l.stream.getTracks().forEach((tr) => tr.stop())
    setListening(false)
    return l
  }

  const finish = useCallback(async (paused: boolean) => {
    const l = teardown()
    if (!l) return
    sendChunk(l.chunks, l.rate)
    const text = await compose()
    optsRef.current.onText(text)
    if (paused) optsRef.current.onPause?.(text)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => void finish(false), [finish])

  const start = useCallback(
    async (current: string) => {
      if (live.current) return
      setError(null)
      base.current = current ? current.replace(/\s*$/, ' ') : ''
      parts.current = []
      try {
        const ctx = audioContext()
        if (ctx.state === 'suspended') await ctx.resume()
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        const source = ctx.createMediaStreamSource(stream)
        const node = ctx.createScriptProcessor(4096, 1, 1)
        const state = { stream, node, source, chunks: [] as Float32Array[], seconds: 0, rate: ctx.sampleRate, heardSpeech: false, silentMs: 0 }
        node.onaudioprocess = (e) => {
          const data = new Float32Array(e.inputBuffer.getChannelData(0))
          state.chunks.push(data)
          const dur = data.length / state.rate
          state.seconds += dur
          let sum = 0
          for (let i = 0; i < data.length; i += 4) sum += data[i] * data[i]
          const rms = Math.sqrt(sum / (data.length / 4))
          if (rms > SPEECH_RMS) {
            state.heardSpeech = true
            state.silentMs = 0
          } else state.silentMs += dur * 1000
          const pauseMs = optsRef.current.autoSendAfterMs
          if (pauseMs && state.heardSpeech && state.silentMs > pauseMs) {
            void finish(true)
            return
          }
          if (state.seconds >= CHUNK_SECONDS) {
            sendChunk(state.chunks, state.rate)
            state.chunks = []
            state.seconds = 0
          }
        }
        source.connect(node)
        node.connect(ctx.destination)
        live.current = state
        setListening(true)
      } catch {
        teardown()
        setError(t('errMicDenied'))
      }
    },
    [finish], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => () => void teardown(), []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    listening,
    transcribing: transcribing > 0,
    start: (current: string) => void start(current),
    stop,
    error,
    supported: opts.enabled && !!opts.creds && canRecord(),
  }
}
