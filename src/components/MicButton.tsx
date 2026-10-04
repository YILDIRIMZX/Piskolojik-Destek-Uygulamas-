import { Microphone, Stop } from '@phosphor-icons/react'
import { useDictation } from '../lib/speech'
import { cx } from './ui'

/** Dictation button for a text field. Speech is appended to the current value. */
export function MicButton({
  value,
  onChange,
  size = 'md',
}: {
  value: string
  onChange: (v: string) => void
  size?: 'sm' | 'md'
}) {
  const d = useDictation({ onText: onChange })
  if (!d.supported) return null
  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        aria-label={d.listening ? 'Dinlemeyi durdur' : 'Konuşarak yaz'}
        onClick={() => (d.listening ? d.stop() : d.start(value))}
        className={cx(
          'relative grid shrink-0 place-items-center rounded-full transition-[transform,background-color] active:scale-90',
          size === 'md' ? 'size-11' : 'size-9',
          d.listening ? 'bg-danger text-white' : 'bg-accent-soft text-accent',
        )}
      >
        {d.listening && <span className="absolute inset-0 animate-ping rounded-full bg-danger/40" />}
        {d.listening ? <Stop size={18} weight="fill" /> : <Microphone size={size === 'md' ? 21 : 18} weight="bold" />}
      </button>
      {d.error && <span className="mt-1 max-w-[220px] text-right text-[12px] text-danger">{d.error}</span>}
    </div>
  )
}
