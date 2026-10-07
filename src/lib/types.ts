import { isIOSStandalone } from './speech'

export type ModelId = 'claude-sonnet-5-5' | 'claude-opus-5-5'

export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  usd: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  /** What the user sees. */
  text: string
  /** Exact text sent to the API. Kept byte-identical so the prompt cache keeps hitting. */
  apiText: string
  ts: number
  hidden?: boolean
}

export interface Session {
  id: string
  no: number
  model: ModelId
  startedAt: number
  endedAt?: number
  /** Time the session screen was open, in ms. Drives the 50-minute clock. */
  activeMs: number
  systemPrompt: string
  messages: ChatMessage[]
  status: 'active' | 'closing' | 'review' | 'done'
  /** Language the session was held in. Older sessions have none and are Turkish. */
  lang?: 'tr' | 'en'
  usage: Usage
  draft?: { report: string; clientFile: string; cycle: CycleStep[]; tools?: ToolConfig }
}

/** Evidence-based tool templates. The counselor chooses which to feature and how to name them. */
export type ToolKind = 'moment' | 'beneath' | 'compassion' | 'breathe' | 'grounding' | 'reframe' | 'values' | 'express' | 'urge'

export type BreathVariant = '478' | 'box' | 'sigh' | 'coherent'

export interface ToolSettings {
  title: string
  subtitle: string
  /** One line from the counselor on why this tool fits the client. */
  why?: string
  // Kind-specific parameters (unused ones are ignored).
  emotions?: string[]
  underneathLabel?: string
  surface?: string
  options?: { name: string; q: string }[]
  kindPhrase?: string
  variant?: BreathVariant
  values?: string[]
  urgeName?: string
  minutes?: number
}

export interface ToolConfig {
  featured: ToolKind[]
  tools: Partial<Record<ToolKind, Partial<ToolSettings>>>
  updatedAt: number
}

/** Entries saved by tools other than the moment log (thought checks, scripts, values, urges). */
export interface ToolEntry {
  id: string
  ts: number
  kind: ToolKind
  title: string
  fields: { label: string; value: string }[]
}

export type TraitKey = 'O' | 'C' | 'E' | 'A' | 'N'

export interface Profile {
  /** Big Five scores, 0-100. */
  scores: Record<TraitKey, number>
  takenAt: number
  concerns: string[]
  note: string
}

export interface Report {
  id: string
  no: number
  date: string
  title: string
  markdown: string
}

export interface JournalEntry {
  id: string
  ts: number
  event: string
  thought: string
  emotions: string[]
  intensity: number
  behavior: string
  underneath: string
}

export interface CycleStep {
  title: string
  detail: string
  alternative: string
}

export interface Settings {
  model: ModelId
  readAloud: boolean
  handsFree: boolean
  speechRate: number
  /** Legacy switch for Safari's speech recognition; superseded by `stt`. */
  inAppSpeech: boolean
  /** Speech-to-text engine: system keyboard dictation, Safari's recognizer or Azure. */
  stt?: 'keyboard' | 'browser' | 'azure'
  /** Chosen speech synthesis voice; empty means the best Turkish voice available. */
  voiceURI?: string
  /** Which engine reads replies aloud. */
  tts?: 'device' | 'azure'
  azureKey?: string
  azureRegion?: string
  azureVoice?: AzureVoice
}

/** Azure neural voice name, e.g. tr-TR-EmelNeural. */
export type AzureVoice = string

export interface Vault {
  version: 1
  apiKey: string
  clientFile: string
  clientFileHistory: { ts: number; markdown: string }[]
  reports: Report[]
  sessions: Session[]
  journal: JournalEntry[]
  cycle: CycleStep[]
  settings: Settings
  toolEntries?: ToolEntry[]
  tools?: ToolConfig
  profile?: Profile
  /** The user chose to skip the personality test on first launch. */
  profileSkipped?: boolean
}

export const sttEngine = (s: Settings): NonNullable<Settings['stt']> => s.stt ?? (s.inAppSpeech ? 'browser' : 'keyboard')

export const emptyUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, usd: 0 })

export const newVault = (): Vault => ({
  version: 1,
  apiKey: '',
  clientFile: '',
  clientFileHistory: [],
  reports: [],
  sessions: [],
  journal: [],
  cycle: [],
  settings: { model: 'claude-sonnet-5-5', readAloud: false, handsFree: false, speechRate: 1, inAppSpeech: !isIOSStandalone() },
})

export const uid = () => crypto.randomUUID()
