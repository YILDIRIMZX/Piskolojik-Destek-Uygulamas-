import { addUsage, extractTag, streamReply, toApiMessages } from '../lib/claude'
import { reportFromMarkdown } from '../lib/files'
import { getLang, t, type Lang } from '../lib/i18n'
import {
  CYCLE_INSTRUCTION,
  CYCLE_SYSTEM,
  OPENING,
  PERSONALIZE_SYSTEM,
  buildSystemPrompt,
  closingInstruction,
  personalizeInstruction,
  reportInstruction,
  timeTag,
} from '../lib/prompts'
import { fullToolConfig, mergeToolConfig, sanitizeToolConfig, type ToolConfigPatch } from '../lib/tools'
import { getVault, update } from '../lib/store'
import { emptyUsage, uid, type ChatMessage, type CycleStep, type Session, type Vault } from '../lib/types'

export const SESSION_MINUTES = 50

export const remainingMinutes = (s: Session) => SESSION_MINUTES - s.activeMs / 60000

export const nextSessionNo = (v: Vault) =>
  Math.max(0, ...v.reports.map((r) => r.no), ...v.sessions.filter((s) => s.status !== 'active').map((s) => s.no)) + 1

const patchSession = (id: string, fn: (s: Session) => Session) =>
  update((v) => ({ ...v, sessions: v.sessions.map((s) => (s.id === id ? fn(s) : s)) }))

const sessionById = (id: string) => getVault()?.sessions.find((s) => s.id === id)

const langOf = (s: Session): Lang => s.lang ?? 'tr'

export function createSession(): string {
  const v = getVault()!
  const no = nextSessionNo(v)
  const lang = getLang()
  const s: Session = {
    lang,
    id: uid(),
    no,
    model: v.settings.model,
    startedAt: Date.now(),
    activeMs: 0,
    systemPrompt: buildSystemPrompt({
      lang,
      sessionNo: no,
      clientFile: v.clientFile,
      lastReport: [...v.reports].sort((a, b) => b.no - a.no)[0],
      journal: [...v.journal].sort((a, b) => b.ts - a.ts),
      toolEntries: [...(v.toolEntries ?? [])].sort((a, b) => b.ts - a.ts),
      profile: v.profile,
      tools: v.tools,
    }),
    messages: [],
    status: 'active',
    usage: emptyUsage(),
  }
  update((x) => ({ ...x, sessions: [s, ...x.sessions] }))
  return s.id
}

export function addActiveTime(id: string, ms: number) {
  patchSession(id, (s) => ({ ...s, activeMs: s.activeMs + ms }))
}

/**
 * Appends a user message (visible or hidden) and streams the assistant reply.
 * `onText` receives partial text while streaming.
 */
export async function send(
  id: string,
  text: string,
  opts: { hidden?: boolean; onText?: (t: string) => void; signal?: AbortSignal } = {},
) {
  const s = sessionById(id)
  const v = getVault()
  if (!s || !v) return
  const userMsg: ChatMessage = {
    id: uid(),
    role: 'user',
    text,
    apiText: text + timeTag(remainingMinutes(s), langOf(s)),
    ts: Date.now(),
    hidden: opts.hidden,
  }
  patchSession(id, (x) => ({ ...x, messages: [...x.messages, userMsg] }))
  await reply(id, opts)
}

/** Streams a reply to the current history. Used by send() and for retry after an error. */
export async function reply(id: string, opts: { onText?: (t: string) => void; signal?: AbortSignal } = {}) {
  const s = sessionById(id)
  const v = getVault()
  if (!s || !v) return
  const res = await streamReply({
    apiKey: v.apiKey,
    model: s.model,
    system: s.systemPrompt,
    messages: toApiMessages(s.messages),
    onText: opts.onText,
    signal: opts.signal,
  })
  const msg: ChatMessage = { id: uid(), role: 'assistant', text: res.text, apiText: res.text, ts: Date.now() }
  patchSession(id, (x) => ({ ...x, messages: [...x.messages, msg], usage: addUsage(x.usage, x.model, res.usage) }))
  return res.text
}

export const start = (id: string, onText?: (t: string) => void) => {
  const s = sessionById(id)
  return send(id, OPENING[s ? langOf(s) : getLang()], { hidden: true, onText })
}

export async function close(id: string, byUser: boolean, onText?: (t: string) => void) {
  patchSession(id, (s) => ({ ...s, status: 'closing' }))
  const s = sessionById(id)
  await send(id, closingInstruction(byUser, s ? langOf(s) : getLang()), { hidden: true, onText })
}

/** Asks for the report, the updated client file and the cycle. Moves the session to review. */
export async function generateReport(id: string) {
  const s = sessionById(id)
  const v = getVault()
  if (!s || !v) return
  const res = await streamReply({
    apiKey: v.apiKey,
    model: s.model,
    system: s.systemPrompt,
    messages: [
      ...toApiMessages(s.messages),
      {
        role: 'user',
        content: reportInstruction(langOf(s), s.no, new Date(s.startedAt).toISOString().slice(0, 10), Math.round(s.activeMs / 60000), v.tools),
      },
    ],
    maxTokens: 24000,
  })
  const report = extractTag(res.text, 'rapor')
  const clientFile = extractTag(res.text, 'danisan_dosyasi')
  if (!report || !clientFile) throw new Error(t('errReportFormat'))
  patchSession(id, (x) => ({
    ...x,
    status: 'review',
    endedAt: x.endedAt ?? Date.now(),
    usage: addUsage(x.usage, x.model, res.usage),
    draft: { report, clientFile, cycle: parseCycle(extractTag(res.text, 'dongu')), tools: patchOrUndefined(parseTools(extractTag(res.text, 'araclar')), v) },
  }))
}

/** Tool settings from a tagged JSON block. "AYNI"/"SAME" or invalid JSON means no change. */
export function parseTools(raw: string | null): ToolConfigPatch | null {
  if (!raw || /^(AYNI|SAME)$/i.test(raw.trim())) return null
  try {
    return sanitizeToolConfig(JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim()))
  } catch {
    return null
  }
}

/** The counselor's changes merged into the current tools, or nothing when there are no changes. */
const patchOrUndefined = (patch: ToolConfigPatch | null, v: Vault) => (patch && (patch.featured || Object.keys(patch.tools).length) ? mergeToolConfig(v.tools, patch) : undefined)

export function parseCycle(raw: string | null): CycleStep[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim())
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x) => x && typeof x.title === 'string')
      .map((x) => ({ title: String(x.title), detail: String(x.detail ?? ''), alternative: String(x.alternative ?? '') }))
  } catch {
    return []
  }
}

export function approve(id: string, edited?: { report: string; clientFile: string; applyTools?: boolean }) {
  update((v) => {
    const s = v.sessions.find((x) => x.id === id)
    if (!s?.draft) return v
    const report = edited?.report ?? s.draft.report
    const clientFile = edited?.clientFile ?? s.draft.clientFile
    const r = reportFromMarkdown(report, s.no)
    return {
      ...v,
      reports: [r, ...v.reports.filter((x) => x.no !== s.no)].sort((a, b) => b.no - a.no),
      clientFileHistory: v.clientFile ? [{ ts: Date.now(), markdown: v.clientFile }, ...v.clientFileHistory].slice(0, 20) : v.clientFileHistory,
      clientFile,
      cycle: s.draft.cycle.length ? s.draft.cycle : v.cycle,
      tools: edited?.applyTools === false ? v.tools : (s.draft.tools ?? v.tools),
      sessions: v.sessions.map((x) => (x.id === id ? { ...x, status: 'done' as const, draft: undefined } : x)),
    }
  })
}

export function discardSession(id: string) {
  update((v) => ({ ...v, sessions: v.sessions.filter((s) => s.id !== id) }))
}

/** Builds the cycle from the client file and reports when no session has produced one yet. */
export async function extractCycle() {
  const v = getVault()
  if (!v) return
  const res = await streamReply({
    apiKey: v.apiKey,
    model: v.settings.model,
    system: CYCLE_SYSTEM[getLang()],
    messages: [
      {
        role: 'user',
        content: `${CYCLE_INSTRUCTION[getLang()]}\n\n<danisan_dosyasi>\n${v.clientFile}\n</danisan_dosyasi>\n\n${v.reports
          .slice(0, 3)
          .map((r) => `<rapor>\n${r.markdown}\n</rapor>`)
          .join('\n\n')}`,
      },
    ],
    maxTokens: 6000,
  })
  const cycle = parseCycle(extractTag(res.text, 'dongu'))
  if (!cycle.length) throw new Error(t('cycleFailed'))
  update((x) => ({ ...x, cycle }))
}

/**
 * One call that tailors the tools to the client (and writes a first client file for new users).
 * Uses the client file, the latest report and the personality test, so it costs a few cents at most.
 */
export async function personalize() {
  const v = getVault()
  if (!v) return
  const lang = getLang()
  const lastReport = [...v.reports].sort((a, b) => b.no - a.no)[0]
  const res = await streamReply({
    apiKey: v.apiKey,
    model: v.settings.model,
    system: PERSONALIZE_SYSTEM[lang],
    messages: [{ role: 'user', content: personalizeInstruction({ lang, profile: v.profile, clientFile: v.clientFile, lastReport, tools: v.tools }) }],
    maxTokens: 8000,
  })
  const patch = parseTools(extractTag(res.text, 'araclar'))
  if (!patch) throw new Error(t('personalizeFailed'))
  const tools = fullToolConfig(patch)
  const file = v.clientFile.trim() ? null : extractTag(res.text, 'danisan_dosyasi')
  update((x) => ({ ...x, tools, clientFile: file ?? x.clientFile }))
}
