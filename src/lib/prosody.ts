// Voice cues from the recorded audio, computed on the device. Only a short text summary
// relative to the speaker's own average is ever sent to the counselor; audio never leaves the phone
// for this purpose.
import type { Lang } from './i18n'

export interface VoiceCues {
  seconds: number
  /** Words per minute, from the transcript. */
  wpm?: number
  /** Mean level of voiced frames, in dBFS. */
  loudnessDb: number
  /** Median pitch in Hz, when enough voiced frames had a clear pitch. */
  pitchHz?: number
  /** Pitch spread in semitones (how lively the intonation is). */
  pitchRangeSt?: number
  /** Pauses longer than 0.7 s per minute of speech. */
  pausesPerMin: number
}

export interface VoiceBaseline {
  n: number
  wpm?: number
  loudnessDb: number
  pitchHz?: number
  pitchRangeSt?: number
  pausesPerMin: number
}

const FRAME = 512 // 32 ms at 16 kHz
const MIN_LAG = 40 // 400 Hz
const MAX_LAG = 213 // 75 Hz

const median = (xs: number[]) => {
  if (!xs.length) return undefined
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/** Autocorrelation pitch for one frame; undefined when the frame isn't clearly periodic. */
function framePitch(x: Float32Array, rate: number): number | undefined {
  // Normalized by the energy of both overlapping parts, so short lags aren't favored.
  const r = new Float32Array(MAX_LAG + 1)
  let best = 0
  for (let lag = MIN_LAG; lag <= MAX_LAG; lag++) {
    let sum = 0
    let e1 = 0
    let e2 = 0
    for (let i = 0; i + lag < x.length; i++) {
      sum += x[i] * x[i + lag]
      e1 += x[i] * x[i]
      e2 += x[i + lag] * x[i + lag]
    }
    r[lag] = e1 && e2 ? sum / Math.sqrt(e1 * e2) : 0
    if (r[lag] > best) best = r[lag]
  }
  if (best < 0.6) return undefined
  // The first strong peak is the period; later peaks are its multiples (octave errors).
  for (let lag = MIN_LAG + 1; lag < MAX_LAG; lag++)
    if (r[lag] >= 0.9 * best && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) return rate / lag
  return undefined
}

export function analyze(pcm: Int16Array, rate = 16000): Omit<VoiceCues, 'wpm'> {
  const frames = Math.floor(pcm.length / FRAME)
  const rms: number[] = []
  for (let f = 0; f < frames; f++) {
    let s = 0
    for (let i = f * FRAME; i < (f + 1) * FRAME; i++) {
      const v = pcm[i] / 32768
      s += v * v
    }
    rms.push(Math.sqrt(s / FRAME))
  }
  // Voiced = clearly above the background level of this recording.
  const floor = [...rms].sort((a, b) => a - b)[Math.floor(rms.length * 0.2)] ?? 0
  const loud = [...rms].sort((a, b) => a - b)[Math.floor(rms.length * 0.9)] ?? 0
  const threshold = Math.max(0.01, Math.min(floor * 3, loud * 0.5))
  const voiced = rms.map((r) => r > threshold)

  const levels = rms.filter((_, i) => voiced[i])
  const meanLevel = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 1e-4
  const loudnessDb = Math.round(20 * Math.log10(meanLevel))

  // Pitch on every other voiced frame keeps this fast on a phone.
  const pitches: number[] = []
  const buf = new Float32Array(FRAME)
  for (let f = 0; f < frames; f += 2) {
    if (!voiced[f]) continue
    for (let i = 0; i < FRAME; i++) buf[i] = pcm[f * FRAME + i] / 32768
    const p = framePitch(buf, rate)
    if (p) pitches.push(p)
  }
  const pitchHz = pitches.length >= 10 ? Math.round(median(pitches)!) : undefined
  let pitchRangeSt: number | undefined
  if (pitchHz && pitches.length >= 10) {
    const st = pitches.map((p) => 12 * Math.log2(p / pitchHz)).sort((a, b) => a - b)
    pitchRangeSt = Math.round((st[Math.floor(st.length * 0.9)] - st[Math.floor(st.length * 0.1)]) * 10) / 10
  }

  // Pauses: silent runs over 0.7 s between voiced parts.
  const minPause = Math.ceil(700 / ((FRAME / rate) * 1000))
  let pauses = 0
  let run = 0
  let started = false
  for (const v of voiced) {
    if (v) {
      if (started && run >= minPause) pauses++
      started = true
      run = 0
    } else run++
  }
  const seconds = pcm.length / rate
  const speechMin = Math.max(0.25, (voiced.filter(Boolean).length * FRAME) / rate / 60)
  return { seconds, loudnessDb, pitchHz, pitchRangeSt, pausesPerMin: Math.round((pauses / speechMin) * 10) / 10 }
}

/** Running average of the speaker's own voice; recent recordings weigh a little more. */
export function updateBaseline(b: VoiceBaseline | undefined, c: VoiceCues): VoiceBaseline {
  if (!b) return { n: 1, wpm: c.wpm, loudnessDb: c.loudnessDb, pitchHz: c.pitchHz, pitchRangeSt: c.pitchRangeSt, pausesPerMin: c.pausesPerMin }
  const w = 1 / Math.min(b.n + 1, 10)
  const mix = (old: number | undefined, nu: number | undefined) =>
    old === undefined ? nu : nu === undefined ? old : old * (1 - w) + nu * w
  return {
    n: b.n + 1,
    wpm: mix(b.wpm, c.wpm),
    loudnessDb: mix(b.loudnessDb, c.loudnessDb)!,
    pitchHz: mix(b.pitchHz, c.pitchHz),
    pitchRangeSt: mix(b.pitchRangeSt, c.pitchRangeSt),
    pausesPerMin: mix(b.pausesPerMin, c.pausesPerMin)!,
  }
}

const WORDS: Record<Lang, Record<string, string>> = {
  tr: {
    fast: 'her zamankinden hızlı konuşuyor',
    slow: 'her zamankinden yavaş konuşuyor',
    loud: 'sesi her zamankinden yüksek',
    quiet: 'sesi her zamankinden alçak',
    high: 'sesi her zamankinden ince (gergin olabilir)',
    low: 'sesi her zamankinden kalın',
    flat: 'tonu tekdüze',
    lively: 'tonu her zamankinden hareketli',
    pausy: 'sık ve uzun duraklıyor',
    fluent: 'neredeyse hiç duraklamadan konuşuyor',
    usual: 'ses tonu her zamanki gibi',
  },
  en: {
    fast: 'speaking faster than usual',
    slow: 'speaking slower than usual',
    loud: 'louder than usual',
    quiet: 'quieter than usual',
    high: 'higher-pitched than usual (possibly tense)',
    low: 'lower-pitched than usual',
    flat: 'flat, monotone intonation',
    lively: 'more animated intonation than usual',
    pausy: 'frequent, long pauses',
    fluent: 'hardly pausing at all',
    usual: 'voice sounds as usual',
  },
}

/**
 * Plain-language cues relative to the speaker's baseline, or '' when there is too little to say.
 * Until a few recordings exist, only clearly unusual absolute values are mentioned.
 */
export function describeCues(c: VoiceCues, b: VoiceBaseline | undefined, lang: Lang): string {
  if (c.seconds < 4) return ''
  const W = WORDS[lang]
  const out: string[] = []
  const ready = b && b.n >= 3
  if (ready) {
    if (c.wpm && b.wpm) {
      if (c.wpm > b.wpm * 1.18) out.push(W.fast)
      else if (c.wpm < b.wpm * 0.82) out.push(W.slow)
    }
    if (c.loudnessDb > b.loudnessDb + 4) out.push(W.loud)
    else if (c.loudnessDb < b.loudnessDb - 4) out.push(W.quiet)
    if (c.pitchHz && b.pitchHz) {
      const st = 12 * Math.log2(c.pitchHz / b.pitchHz)
      if (st > 1.5) out.push(W.high)
      else if (st < -1.5) out.push(W.low)
    }
    if (c.pitchRangeSt && b.pitchRangeSt) {
      if (c.pitchRangeSt < b.pitchRangeSt * 0.7) out.push(W.flat)
      else if (c.pitchRangeSt > b.pitchRangeSt * 1.4) out.push(W.lively)
    }
    if (c.pausesPerMin > b.pausesPerMin * 1.6 + 1) out.push(W.pausy)
  } else {
    if (c.wpm && c.wpm > 190) out.push(W.fast)
    if (c.wpm && c.wpm < 80) out.push(W.slow)
    if (c.pitchRangeSt !== undefined && c.pitchRangeSt < 2) out.push(W.flat)
    if (c.pausesPerMin > 12) out.push(W.pausy)
  }
  if (!out.length) return ready ? W.usual : ''
  return out.join(', ')
}
