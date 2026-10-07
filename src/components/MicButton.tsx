import { CircleNotch, Microphone, Stop } from '@phosphor-icons/react'
import { useState, type RefObject } from 'react'
import { useSpeechInput } from '../lib/dictation'
import { t } from '../lib/i18n'
import { useV } from '../lib/store'
import { cx } from './ui'

/**
 * Dictation button for a text field. Uses the speech engine chosen in settings;
 * with the keyboard engine it focuses the field so the iPhone keyboard's own dictation can be used.
 */
export function MicButton({
  value,
  onChange,
  target,
  size = 'md',
}: {
  value: string
  onChange: (v: string) => void
  target: RefObject<HTMLTextAreaElement | null>
  size?: 'sm' | 'md'
}) {
  const v = useV()
  const d = useSpeechInput(v.settings, { onText: onChange })
  const [hint, setHint] = useState(false)

  const onClick = () => {
    if (!d.supported) {
      target.current?.focus()
      setHint(true)
      return
    }
    if (d.listening) d.stop()
    else d.start(value)
  }

  const message = d.error ?? (d.transcribing ? t('transcribing') : hint && !d.supported ? t('keyboardHint') : null)

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        aria-label={d.listening ? t('stopListening') : t('dictate')}
        onClick={onClick}
        disabled={d.transcribing}
        className={cx(
          'relative grid shrink-0 place-items-center rounded-full transition-[transform,background-color] active:scale-90',
          size === 'md' ? 'size-11' : 'size-9',
          d.listening ? 'bg-danger text-white' : 'bg-accent-soft text-accent',
        )}
      >
        {d.listening && <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-danger/40" />}
        {d.transcribing ? (
          <CircleNotch size={18} weight="bold" className="animate-spin" />
        ) : d.listening ? (
          <Stop size={18} weight="fill" />
        ) : (
          <Microphone size={size === 'md' ? 21 : 18} weight="bold" />
        )}
      </button>
      {message && <span className="mt-1 max-w-[150px] text-right text-[12px] leading-snug text-muted">{message}</span>}
    </div>
  )
}
