import { Microphone, Stop } from '@phosphor-icons/react'
import { useState, type RefObject } from 'react'
import { useDictation } from '../lib/speech'
import { useV } from '../lib/store'
import { cx } from './ui'

export const KEYBOARD_HINT = 'Klavyedeki mikrofon tuşuna basıp konuş.'

/**
 * Dictation button for a text field. Uses in-app recognition when enabled in settings;
 * otherwise focuses the field so the iPhone keyboard's own dictation can be used.
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
  const d = useDictation({ onText: onChange, enabled: v.settings.inAppSpeech })
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

  const message = d.error ?? (hint && !d.supported ? KEYBOARD_HINT : null)

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        aria-label={d.listening ? 'Dinlemeyi durdur' : 'Konuşarak yaz'}
        onClick={onClick}
        className={cx(
          'relative grid shrink-0 place-items-center rounded-full transition-[transform,background-color] active:scale-90',
          size === 'md' ? 'size-11' : 'size-9',
          d.listening ? 'bg-danger text-white' : 'bg-accent-soft text-accent',
        )}
      >
        {d.listening && <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-danger/40" />}
        {d.listening ? <Stop size={18} weight="fill" /> : <Microphone size={size === 'md' ? 21 : 18} weight="bold" />}
      </button>
      {message && <span className="mt-1 max-w-[150px] text-right text-[12px] leading-snug text-muted">{message}</span>}
    </div>
  )
}
