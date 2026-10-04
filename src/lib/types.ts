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
  usage: Usage
  draft?: { report: string; clientFile: string; cycle: CycleStep[] }
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
  /** Safari's own speech recognition. Off by default in iPhone home-screen mode, where keyboard dictation is used. */
  inAppSpeech: boolean
}

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
}

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
