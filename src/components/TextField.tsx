import { useRef } from 'react'
import { MicButton } from './MicButton'
import { Field, inputClass } from './ui'

/** Multi-line field with a dictation button. */
export function TextField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  return (
    <Field label={label}>
      <div className="flex items-start gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          placeholder={hint}
          rows={2}
          className={`${inputClass} [field-sizing:content] min-h-[76px] resize-none`}
        />
        <MicButton value={value} onChange={onChange} target={ref} />
      </div>
    </Field>
  )
}
