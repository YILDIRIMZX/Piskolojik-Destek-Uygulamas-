// Big Five personality, measured with the 20-item Mini-IPIP (Donnellan et al., 2006).
// IPIP items are in the public domain. The Turkish wording is this app's own translation,
// not a validated adaptation. Scoring runs entirely on the device.
import type { Lang } from './i18n'
import type { Profile, TraitKey } from './types'

interface Item {
  trait: TraitKey
  reverse: boolean
  text: Record<Lang, string>
}

export const ITEMS: Item[] = [
  { trait: 'E', reverse: false, text: { en: 'Am the life of the party.', tr: 'Bulunduğum ortamın neşe kaynağıyımdır.' } },
  { trait: 'A', reverse: false, text: { en: "Sympathize with others' feelings.", tr: 'Başkalarının duygularına karşı anlayışlıyımdır.' } },
  { trait: 'C', reverse: false, text: { en: 'Get chores done right away.', tr: 'Yapılacak işleri bekletmeden hemen hallederim.' } },
  { trait: 'N', reverse: false, text: { en: 'Have frequent mood swings.', tr: 'Ruh halim sık sık değişir.' } },
  { trait: 'O', reverse: false, text: { en: 'Have a vivid imagination.', tr: 'Canlı bir hayal gücüm vardır.' } },
  { trait: 'E', reverse: true, text: { en: "Don't talk a lot.", tr: 'Çok konuşmam.' } },
  { trait: 'A', reverse: true, text: { en: "Am not interested in other people's problems.", tr: 'Başkalarının sorunları ilgimi çekmez.' } },
  { trait: 'C', reverse: true, text: { en: 'Often forget to put things back in their proper place.', tr: 'Eşyaları yerine koymayı sık sık unuturum.' } },
  { trait: 'N', reverse: true, text: { en: 'Am relaxed most of the time.', tr: 'Çoğu zaman rahatımdır.' } },
  { trait: 'O', reverse: true, text: { en: 'Am not interested in abstract ideas.', tr: 'Soyut fikirler ilgimi çekmez.' } },
  { trait: 'E', reverse: false, text: { en: 'Talk to a lot of different people at parties.', tr: 'Toplu ortamlarda birçok farklı insanla konuşurum.' } },
  { trait: 'A', reverse: false, text: { en: "Feel others' emotions.", tr: 'Başkalarının duygularını ben de hissederim.' } },
  { trait: 'C', reverse: false, text: { en: 'Like order.', tr: 'Düzeni severim.' } },
  { trait: 'N', reverse: false, text: { en: 'Get upset easily.', tr: 'Çabuk moralim bozulur.' } },
  { trait: 'O', reverse: true, text: { en: 'Have difficulty understanding abstract ideas.', tr: 'Soyut fikirleri anlamakta zorlanırım.' } },
  { trait: 'E', reverse: true, text: { en: 'Keep in the background.', tr: 'Arka planda kalmayı tercih ederim.' } },
  { trait: 'A', reverse: true, text: { en: 'Am not really interested in others.', tr: 'Başkalarıyla pek ilgilenmem.' } },
  { trait: 'C', reverse: true, text: { en: 'Make a mess of things.', tr: 'İşleri sık sık karman çorman ederim.' } },
  { trait: 'N', reverse: true, text: { en: 'Seldom feel blue.', tr: 'Nadiren hüzünlü hissederim.' } },
  { trait: 'O', reverse: true, text: { en: 'Do not have a good imagination.', tr: 'Hayal gücüm pek güçlü değildir.' } },
]

export const TRAITS: TraitKey[] = ['O', 'C', 'E', 'A', 'N']

/** Answers are 1-5 (strongly disagree to strongly agree). Returns 0-100 per trait. */
export function score(answers: number[]): Record<TraitKey, number> {
  const sums: Record<TraitKey, number[]> = { O: [], C: [], E: [], A: [], N: [] }
  ITEMS.forEach((it, i) => {
    const a = answers[i]
    if (a) sums[it.trait].push(it.reverse ? 6 - a : a)
  })
  const out = {} as Record<TraitKey, number>
  for (const k of TRAITS) {
    const xs = sums[k]
    const mean = xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 3
    out[k] = Math.round(((mean - 1) / 4) * 100)
  }
  return out
}

interface TraitText {
  name: string
  low: string
  high: string
  adj: [string, string]
  noun: [string, string]
  desc: [string, string, string]
}

/** [low, high] pairs and three description levels (low, middle, high). */
export const TRAIT_TEXT: Record<Lang, Record<TraitKey, TraitText>> = {
  tr: {
    O: {
      name: 'Deneyime açıklık',
      low: 'Pratik',
      high: 'Meraklı',
      adj: ['Pratik', 'Meraklı'],
      noun: ['Uygulayıcı', 'Kaşif'],
      desc: [
        'Somut ve denenmiş yolları seversin. Ayakların yere sağlam basar.',
        'Yeniyle bilineni dengelersin. Gerektiğinde merak eder, gerektiğinde pratik davranırsın.',
        'Fikirler, sanat ve yeni deneyimler seni besler. Soyut düşünmekten keyif alırsın.',
      ],
    },
    C: {
      name: 'Sorumluluk',
      low: 'Esnek',
      high: 'Düzenli',
      adj: ['Esnek', 'Düzenli'],
      noun: ['Doğaçlamacı', 'Mimar'],
      desc: [
        'Anı yaşar, plana sıkı sıkıya bağlı kalmazsın. Esneklik güçlü yanın.',
        'Plan ile esneklik arasında denge kurarsın.',
        'Planlı, düzenli ve kararlısın. İşleri sonuna kadar götürürsün.',
      ],
    },
    E: {
      name: 'Dışadönüklük',
      low: 'İçe dönük',
      high: 'Dışa dönük',
      adj: ['Sakin', 'Enerjik'],
      noun: ['Gözlemci', 'Bağ Kurucu'],
      desc: [
        'Enerjini yalnız ya da küçük gruplar içinde toplarsın. Dinlemeyi ve gözlemlemeyi seversin.',
        'Hem sosyal ortamlardan hem de yalnız kalmaktan beslenebilirsin.',
        'İnsanlar ve hareket seni canlandırır. Sosyal ortamlarda kendini rahat hissedersin.',
      ],
    },
    A: {
      name: 'Uyumluluk',
      low: 'Doğrudan',
      high: 'Uyumlu',
      adj: ['Doğrudan', 'Şefkatli'],
      noun: ['Savunucu', 'Arabulucu'],
      desc: [
        'Açık sözlü ve bağımsızsın. Gerektiğinde fikrini savunmaktan çekinmezsin.',
        'İş birliği ile kendi sınırların arasında denge kurarsın.',
        'Başkalarının duygularına duyarlısın. Uyum ve iş birliği senin için önemli.',
      ],
    },
    N: {
      name: 'Duygusal hassasiyet',
      low: 'Dengeli',
      high: 'Hassas',
      adj: ['Dengeli', 'Duyarlı'],
      noun: ['Çapa', 'Derin Hisseden'],
      desc: [
        'Stres altında çoğu zaman sakin kalırsın. Duyguların seni kolay sarsmaz.',
        'Çoğu durumda dengelisin, zor dönemlerde duyguların yoğunlaşabilir.',
        'Duyguları yoğun yaşarsın. Bu hem derinlik hem de yorgunluk getirebilir. Duygu düzenleme becerileri sana iyi gelebilir.',
      ],
    },
  },
  en: {
    O: {
      name: 'Openness',
      low: 'Practical',
      high: 'Curious',
      adj: ['Practical', 'Curious'],
      noun: ['Doer', 'Explorer'],
      desc: [
        'You like concrete, proven ways. Your feet are on the ground.',
        'You balance the new and the familiar. Curious when it helps, practical when it counts.',
        'Ideas, art and new experiences feed you. You enjoy abstract thinking.',
      ],
    },
    C: {
      name: 'Conscientiousness',
      low: 'Flexible',
      high: 'Organized',
      adj: ['Flexible', 'Organized'],
      noun: ['Improviser', 'Architect'],
      desc: [
        "You live in the moment and don't cling to plans. Flexibility is your strength.",
        'You balance planning and flexibility.',
        'You are planned, orderly and determined. You see things through.',
      ],
    },
    E: {
      name: 'Extraversion',
      low: 'Introverted',
      high: 'Extraverted',
      adj: ['Quiet', 'Energetic'],
      noun: ['Observer', 'Connector'],
      desc: [
        'You recharge alone or in small groups. You like listening and observing.',
        'You can draw energy both from people and from time alone.',
        'People and activity energize you. You feel at ease in social settings.',
      ],
    },
    A: {
      name: 'Agreeableness',
      low: 'Direct',
      high: 'Cooperative',
      adj: ['Direct', 'Caring'],
      noun: ['Advocate', 'Mediator'],
      desc: [
        "You are outspoken and independent. You don't shy away from defending your view.",
        'You balance cooperation with your own boundaries.',
        "You are attuned to others' feelings. Harmony and cooperation matter to you.",
      ],
    },
    N: {
      name: 'Emotional sensitivity',
      low: 'Steady',
      high: 'Sensitive',
      adj: ['Steady', 'Sensitive'],
      noun: ['Anchor', 'Deep Feeler'],
      desc: [
        'You usually stay calm under stress. Your emotions rarely knock you off balance.',
        'You are steady most of the time; emotions can intensify in hard periods.',
        'You feel things intensely. That brings depth and can bring fatigue. Emotion regulation skills may serve you well.',
      ],
    },
  },
}

export const level = (v: number) => (v < 40 ? 0 : v > 60 ? 2 : 1)

/** A friendly name from the two most distinctive traits, e.g. "Meraklı Mimar". */
export function archetype(scores: Record<TraitKey, number>, lang: Lang): string {
  const ranked = [...TRAITS].sort((a, b) => Math.abs(scores[b] - 50) - Math.abs(scores[a] - 50))
  const [first, second] = ranked
  if (Math.abs(scores[first] - 50) < 10) return lang === 'tr' ? 'Dengeli Gezgin' : 'Balanced Wanderer'
  const T = TRAIT_TEXT[lang]
  const noun = T[first].noun[scores[first] >= 50 ? 1 : 0]
  const adj = T[second].adj[scores[second] >= 50 ? 1 : 0]
  return `${adj} ${noun}`
}

export const CONCERNS: Record<Lang, { id: string; label: string }[]> = {
  tr: [
    { id: 'anger', label: 'Öfke ve sinir' },
    { id: 'anxiety', label: 'Kaygı ve endişe' },
    { id: 'relationships', label: 'İlişkiler ve aidiyet' },
    { id: 'mood', label: 'Düşük ruh hali' },
    { id: 'critic', label: 'İç eleştirmen ve özgüven' },
    { id: 'stress', label: 'Stres ve tükenmişlik' },
    { id: 'sleep', label: 'Uyku' },
    { id: 'grief', label: 'Yas ve kayıp' },
    { id: 'habits', label: 'Dürtüler ve alışkanlıklar' },
    { id: 'self', label: 'Kendimi tanımak' },
  ],
  en: [
    { id: 'anger', label: 'Anger and irritability' },
    { id: 'anxiety', label: 'Anxiety and worry' },
    { id: 'relationships', label: 'Relationships and belonging' },
    { id: 'mood', label: 'Low mood' },
    { id: 'critic', label: 'Inner critic and self-esteem' },
    { id: 'stress', label: 'Stress and burnout' },
    { id: 'sleep', label: 'Sleep' },
    { id: 'grief', label: 'Grief and loss' },
    { id: 'habits', label: 'Urges and habits' },
    { id: 'self', label: 'Getting to know myself' },
  ],
}

/** Short English summary for the counselor prompt. */
export function profileForPrompt(p: Profile | undefined): string {
  if (!p) return ''
  const t = TRAIT_TEXT.en
  const traits = TRAITS.map((k) => `${t[k].name} ${p.scores[k]}/100`).join(', ')
  const concerns = p.concerns
    .map((id) => CONCERNS.en.find((c) => c.id === id)?.label)
    .filter(Boolean)
    .join(', ')
  return [
    `Big Five (Mini-IPIP, self-report, a light hint not a label): ${traits}.`,
    concerns ? `What brought the client here: ${concerns}.` : '',
    p.note ? `In the client's words: "${p.note}"` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
