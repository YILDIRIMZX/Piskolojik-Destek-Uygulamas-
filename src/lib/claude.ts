import Anthropic from '@anthropic-ai/sdk'
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { ChatMessage, ModelId, Usage } from './types'

// $ per 1M tokens (Anthropic price list, 2026-09). Cache writes use the 5-minute TTL rate (1.25x input).
const PRICES: Record<ModelId, { in: number; out: number; read: number; write: number }> = {
  'claude-sonnet-5-5': { in: 2, out: 10, read: 0.2, write: 2.5 },
  'claude-opus-5-5': { in: 4, out: 20, read: 0.2, write: 5 },
}

export const MODEL_LABELS: Record<ModelId, string> = {
  'claude-sonnet-5-5': 'Sonnet 5.5',
  'claude-opus-5-5': 'Opus 5.5',
}

const client = (apiKey: string) =>
  // The key lives only on this device and requests go straight to Anthropic, so browser access is intended.
  new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 })

export class RefusalError extends Error {}

export function addUsage(total: Usage, model: ModelId, u: Anthropic.Beta.BetaUsage): Usage {
  const p = PRICES[model]
  const input = u.input_tokens ?? 0
  const output = u.output_tokens ?? 0
  const cacheRead = u.cache_read_input_tokens ?? 0
  const cacheWrite = u.cache_creation_input_tokens ?? 0
  const usd = (input * p.in + output * p.out + cacheRead * p.read + cacheWrite * p.write) / 1e6
  return {
    input: total.input + input,
    output: total.output + output,
    cacheRead: total.cacheRead + cacheRead,
    cacheWrite: total.cacheWrite + cacheWrite,
    usd: total.usd + usd,
  }
}

export const toApiMessages = (messages: ChatMessage[]): BetaMessageParam[] =>
  messages.map((m) => ({ role: m.role, content: m.apiText }))

export interface StreamResult {
  text: string
  usage: Anthropic.Beta.BetaUsage
}

export async function streamReply(opts: {
  apiKey: string
  model: ModelId
  system: string
  messages: BetaMessageParam[]
  maxTokens?: number
  onText?: (full: string) => void
  signal?: AbortSignal
}): Promise<StreamResult> {
  const stream = client(opts.apiKey).beta.messages.stream(
    {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      // Caches the system prompt and the whole history; each turn only pays full price for new text.
      cache_control: { type: 'ephemeral' },
      system: opts.system,
      messages: opts.messages,
    },
    { signal: opts.signal },
  )
  let text = ''
  stream.on('text', (delta) => {
    text += delta
    opts.onText?.(text)
  })
  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') throw new RefusalError('refusal')
  const out = final.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return { text: out, usage: final.usage }
}

/** Cheap call that checks the key works (no tokens used). */
export async function checkKey(apiKey: string) {
  await client(apiKey).models.retrieve('claude-sonnet-5-5')
}

export function describeError(err: unknown): string {
  if (err instanceof RefusalError)
    return 'Bu cevap güvenlik filtresine takıldı. Mesajını biraz farklı ifade edip tekrar deneyebilirsin.'
  if (err instanceof Anthropic.AuthenticationError) return 'API anahtarı geçersiz. Ayarlardan kontrol et.'
  if (err instanceof Anthropic.PermissionDeniedError) return 'Bu anahtarın bu modele erişimi yok.'
  if (err instanceof Anthropic.RateLimitError) return 'Çok sık istek gönderildi ya da kredi limiti doldu. Biraz bekleyip tekrar dene.'
  if (err instanceof Anthropic.APIConnectionError) return 'İnternet bağlantısı yok gibi görünüyor.'
  if (err instanceof Anthropic.APIError) {
    if (err.status === 400 && /credit|balance/i.test(err.message)) return 'Hesapta kredi kalmamış. Konsoldan kredi yükleyebilirsin.'
    return `Claude hatası (${err.status ?? '?'}). Tekrar dene.`
  }
  if (err instanceof Error && err.name === 'AbortError') return 'İptal edildi.'
  return 'Beklenmeyen bir hata oldu. Tekrar dene.'
}

export const extractTag = (text: string, tag: string) => {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].trim() : null
}
