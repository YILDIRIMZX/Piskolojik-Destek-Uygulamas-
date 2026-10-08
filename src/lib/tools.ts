import type { Lang } from './i18n'
import type { BreathVariant, ToolConfig, ToolKind, ToolSettings } from './types'

export const TOOL_KINDS: ToolKind[] = ['moment', 'beneath', 'compassion', 'breathe', 'grounding', 'reframe', 'values', 'express', 'urge']
export const BREATH_VARIANTS: BreathVariant[] = ['478', 'box', 'sigh', 'coherent']

const DEFAULT_FEATURED: ToolKind[] = ['moment', 'breathe', 'grounding', 'compassion', 'reframe']

type Defaults = Record<ToolKind, ToolSettings>

const DEFAULTS: Record<Lang, Defaults> = {
  tr: {
    moment: {
      title: 'Duygu anı',
      subtitle: 'Zor bir anı kaydet: ne oldu, ne düşündün, ne hissettin, ne yaptın.',
      emotions: ['Öfke', 'Kaygı', 'Üzüntü', 'İncinme', 'Utanç', 'Yalnızlık', 'Suçluluk', 'Hayal kırıklığı', 'Çaresizlik'],
      underneathLabel: 'Bu duygunun altında başka bir şey var mıydı?',
    },
    beneath: {
      title: 'Duygunun altında',
      subtitle: 'Yüzeydeki duygunun altındaki asıl duyguyu bul.',
      surface: 'bu duygu',
      options: [
        { name: 'İncinme', q: 'Biri beni kırdı mı?' },
        { name: 'Dışlanma', q: 'Kenarda mı kaldım?' },
        { name: 'Değersizlik', q: 'Önemsiz ya da gereksiz mi hissettim?' },
        { name: 'Terk edilme korkusu', q: 'Kaybetmekten ya da yerimin dolmasından mı korktum?' },
        { name: 'Utanç', q: 'Görülmek istemediğim bir yanım mı açığa çıktı?' },
        { name: 'Yorgunluk', q: 'Uykusuz ya da aşırı yüklü müydüm?' },
        { name: 'Çaresizlik', q: 'Kontrolü kaybettiğimi mi hissettim?' },
        { name: 'Hayal kırıklığı', q: 'Beklediğim karşılığı mı alamadım?' },
      ],
    },
    compassion: { title: 'Öz-şefkat molası', subtitle: 'Üç adımda kendine bir dost gibi davran.' },
    breathe: { title: 'Nefes', subtitle: 'Bedenini sakinleştir.', variant: '478' },
    grounding: { title: 'Topraklanma', subtitle: '5-4-3-2-1 ile ana dön.' },
    reframe: { title: 'Düşünce kontrolü', subtitle: 'Seni zorlayan düşünceyi kanıtlarla tart.' },
    values: {
      title: 'Değer pusulası',
      subtitle: 'Senin için önemli olana doğru küçük bir adım seç.',
      values: ['Aile', 'Dostluk', 'Sağlık', 'Dürüstlük', 'Özgürlük', 'Öğrenmek', 'Üretmek', 'Cesaret', 'Huzur', 'Yardımlaşma', 'Adalet', 'Sevgi'],
    },
    express: { title: 'Kendini ifade et', subtitle: 'Zor bir konuşmayı sakin ve net hazırla.' },
    urge: { title: 'Dürtü dalgası', subtitle: 'Güçlü bir dürtüyü harekete geçmeden izle.', urgeName: 'dürtü', minutes: 3 },
  },
  en: {
    moment: {
      title: 'Emotion log',
      subtitle: 'Note a hard moment: what happened, what you thought, felt and did.',
      emotions: ['Anger', 'Anxiety', 'Sadness', 'Hurt', 'Shame', 'Loneliness', 'Guilt', 'Disappointment', 'Helplessness'],
      underneathLabel: 'Was there something beneath this feeling?',
    },
    beneath: {
      title: 'Beneath the feeling',
      subtitle: 'Find the real feeling under the surface one.',
      surface: 'this feeling',
      options: [
        { name: 'Hurt', q: 'Did someone hurt me?' },
        { name: 'Exclusion', q: 'Was I left on the sidelines?' },
        { name: 'Worthlessness', q: 'Did I feel unimportant or unneeded?' },
        { name: 'Fear of abandonment', q: 'Was I afraid of losing someone or being replaced?' },
        { name: 'Shame', q: "Did a side of me I didn't want seen come out?" },
        { name: 'Exhaustion', q: 'Was I sleep-deprived or overloaded?' },
        { name: 'Helplessness', q: 'Did I feel I was losing control?' },
        { name: 'Disappointment', q: "Did I not get the response I expected?" },
      ],
    },
    compassion: { title: 'Self-compassion break', subtitle: 'Treat yourself like a friend in three steps.' },
    breathe: { title: 'Breathe', subtitle: 'Calm your body.', variant: '478' },
    grounding: { title: 'Grounding', subtitle: 'Come back to the present with 5-4-3-2-1.' },
    reframe: { title: 'Thought check', subtitle: 'Weigh a hard thought against the evidence.' },
    values: {
      title: 'Values compass',
      subtitle: 'Pick one small step toward what matters to you.',
      values: ['Family', 'Friendship', 'Health', 'Honesty', 'Freedom', 'Learning', 'Creating', 'Courage', 'Peace', 'Helping', 'Fairness', 'Love'],
    },
    express: { title: 'Say it clearly', subtitle: 'Prepare a hard conversation calmly and clearly.' },
    urge: { title: 'Urge surfing', subtitle: 'Watch a strong urge pass without acting on it.', urgeName: 'urge', minutes: 3 },
  },
}

/** What each tool is, for the counselor prompt (kept in English; the model writes the user-facing text in the client's language). */
export const TOOL_CATALOG = `- moment: structured log of a hard moment (CBT thought record): event, thought, emotion chips, intensity 0-10, behavior, and what lay beneath. Params: emotions (6-12 short emotion words the client is likely to need), underneathLabel (the question asked about the deeper feeling).
- beneath: primary vs. secondary emotion exercise. The client taps what may lie under a surface emotion. Params: surface (the surface emotion, lowercase noun, e.g. "anger"), options (6-10 items of {name, q}: a deeper emotion and a short self-question).
- compassion: three-step self-compassion break (Neff): name the pain, common humanity, kindness. Params: kindPhrase (an optional short kind sentence tailored to the client's inner critic).
- breathe: paced breathing. Params: variant ("478" for calming and sleep, "box" for focus under stress, "sigh" for fast relief from acute stress, "coherent" for daily practice).
- grounding: 5-4-3-2-1 senses exercise for anxiety, dissociation or overwhelm. No params.
- reframe: cognitive restructuring: hot thought, belief %, evidence for and against, balanced thought. No params.
- values: ACT values compass: choose values, then one small action this week. Params: values (8-14 single words relevant to the client).
- express: assertive communication script (DBT DEAR MAN): describe, express, ask, reinforce. For relationship and conflict work. No params.
- urge: urge surfing for impulses (outbursts, cravings, avoidance): rate the urge, ride it out over a few minutes, rate again. Params: urgeName (what the urge is, short lowercase noun phrase), minutes (2-5).`

const cap = (s: unknown, n: number) => (typeof s === 'string' ? s.trim().slice(0, n) : undefined)

export const TITLE_MAX = 24
export const TITLE_MAX_WORDS = 4

/** Titles are never cut: a title that breaks the limits is rejected and the default name is used. */
export const validTitle = (s: unknown): string | undefined => {
  if (typeof s !== 'string') return undefined
  const v = s.trim().replace(/\s+/g, ' ')
  return v && v.length <= TITLE_MAX && v.split(' ').length <= TITLE_MAX_WORDS ? v : undefined
}

/** Longer texts are shortened at a word boundary with an ellipsis, never mid-word. */
const capWords = (s: unknown, n: number) => {
  if (typeof s !== 'string') return undefined
  const v = s.trim().replace(/\s+/g, ' ')
  if (v.length <= n) return v || undefined
  const cut = v.slice(0, n - 1)
  const at = cut.lastIndexOf(' ')
  return `${(at > n / 2 ? cut.slice(0, at) : cut).replace(/[\s,;:.-]+$/, '')}…`
}
const capList = (a: unknown, max: number, len: number) =>
  Array.isArray(a) ? a.map((x) => cap(x, len)).filter((x): x is string => !!x).slice(0, max) : undefined

/** Counselor output after validation. `featured` is absent when the counselor didn't send it. */
export interface ToolConfigPatch {
  featured?: ToolKind[]
  tools: ToolConfig['tools']
}

/** Validates counselor output against the allowed shape. Unknown keys and bad values are dropped. */
export function sanitizeToolConfig(raw: unknown): ToolConfigPatch | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { featured?: unknown; tools?: Record<string, Record<string, unknown>> }
  const featured = Array.isArray(r.featured)
    ? [...new Set(r.featured.filter((k): k is ToolKind => TOOL_KINDS.includes(k as ToolKind)))].slice(0, 5)
    : []
  const tools: ToolConfig['tools'] = {}
  for (const kind of TOOL_KINDS) {
    const t = r.tools?.[kind]
    if (!t || typeof t !== 'object') continue
    const s: Partial<ToolSettings> = {}
    const title = validTitle(t.title)
    const subtitle = capWords(t.subtitle, 90)
    const why = capWords(t.why, 160)
    if (title) s.title = title
    if (subtitle) s.subtitle = subtitle
    if (why) s.why = why
    if (kind === 'moment') {
      const emotions = capList(t.emotions, 12, 20)
      if (emotions?.length) s.emotions = emotions
      const u = cap(t.underneathLabel, 80)
      if (u) s.underneathLabel = u
    }
    if (kind === 'beneath') {
      const surface = cap(t.surface, 30)
      if (surface) s.surface = surface
      if (Array.isArray(t.options)) {
        const options = t.options
          .map((o) => ({ name: cap((o as { name?: unknown })?.name, 28) ?? '', q: cap((o as { q?: unknown })?.q, 80) ?? '' }))
          .filter((o) => o.name && o.q)
          .slice(0, 10)
        if (options.length >= 3) s.options = options
      }
    }
    if (kind === 'compassion') {
      const k = cap(t.kindPhrase, 160)
      if (k) s.kindPhrase = k
    }
    if (kind === 'breathe' && BREATH_VARIANTS.includes(t.variant as BreathVariant)) s.variant = t.variant as BreathVariant
    if (kind === 'values') {
      const values = capList(t.values, 14, 22)
      if (values && values.length >= 4) s.values = values
    }
    if (kind === 'urge') {
      const name = cap(t.urgeName, 40)
      if (name) s.urgeName = name
      const m = Number(t.minutes)
      if (m >= 2 && m <= 5) s.minutes = Math.round(m)
    }
    tools[kind] = s
  }
  return { featured: featured.length ? featured : undefined, tools }
}

/** Applies a counselor patch on top of the current configuration: changed tools are merged field by field. */
export function mergeToolConfig(base: ToolConfig | undefined, patch: ToolConfigPatch): ToolConfig {
  const tools: ToolConfig['tools'] = { ...(base?.tools ?? {}) }
  for (const [kind, s] of Object.entries(patch.tools) as [ToolKind, Partial<ToolSettings>][]) tools[kind] = { ...(tools[kind] ?? {}), ...s }
  return { featured: patch.featured ?? base?.featured ?? DEFAULT_FEATURED, tools, updatedAt: Date.now() }
}

/** A complete configuration from a patch (used when the counselor writes a fresh setup). */
export const fullToolConfig = (patch: ToolConfigPatch): ToolConfig => mergeToolConfig(undefined, patch)

/** A tool's settings: counselor overrides on top of the language defaults. */
export function toolSettings(config: ToolConfig | undefined, kind: ToolKind, lang: Lang): ToolSettings {
  const custom = config?.tools[kind] ?? {}
  const s = { ...DEFAULTS[lang][kind], ...custom }
  // Titles saved by older versions could be cut mid-word; those fall back to the default name.
  if (custom.title && !validTitle(custom.title)) s.title = DEFAULTS[lang][kind].title
  return s
}

export const featuredTools = (config: ToolConfig | undefined): ToolKind[] => config?.featured ?? DEFAULT_FEATURED

/** Compact JSON of the current configuration for the counselor (only overrides, to save tokens). */
export const configForPrompt = (config: ToolConfig | undefined) =>
  JSON.stringify({ featured: featuredTools(config), tools: config?.tools ?? {} })

/** Plain list of the client's tools with their current names, for the session prompt. */
export const toolListForPrompt = (config: ToolConfig | undefined, lang: Lang) =>
  TOOL_KINDS.map((k) => {
    const s = toolSettings(config, k, lang)
    return `- ${k}: "${s.title}"${featuredTools(config).includes(k) ? ' (featured on home screen)' : ''}`
  }).join('\n')

/** Human-readable differences between two configurations, for the review screen. */
export function configChanges(before: ToolConfig | undefined, after: ToolConfig, lang: Lang) {
  const out: { kind: ToolKind; title: string; why?: string; changed: boolean; featured: boolean; unfeatured: boolean }[] = []
  for (const kind of TOOL_KINDS) {
    const a = toolSettings(before, kind, lang)
    const b = toolSettings(after, kind, lang)
    const changed = JSON.stringify(a) !== JSON.stringify(b)
    const featured = featuredTools(after).includes(kind)
    const wasFeatured = featuredTools(before).includes(kind)
    if (changed || featured !== wasFeatured)
      out.push({ kind, title: b.title, why: changed ? b.why : undefined, changed, featured: featured && !wasFeatured, unfeatured: wasFeatured && !featured })
  }
  return out
}
