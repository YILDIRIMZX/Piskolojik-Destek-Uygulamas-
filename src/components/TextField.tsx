import { useRef, useState } from 'react'
import { useWakeLock } from '../lib/wakeLock'
import { MicButton } from './MicButton'
import { Field, inputClass } from './ui'

/** Multi-line field with a dictation button. */
export function TextField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // Keyboard dictation can run long; keep the screen on while the field is being used.
  const [focused, setFocused] = useState(false)
  useWakeLock(focused)
  return (
    <Field label={label}>
      <div className="flex items-start gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={hint}
          rows={2}
          className={`${inputClass} [field-sizing:content] min-h-[76px] resize-none`}
        />
        <MicButton value={value} onChange={onChange} target={ref} />
      </div>
    </Field>
  )
}
