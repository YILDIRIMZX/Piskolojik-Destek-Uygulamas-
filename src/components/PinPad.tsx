import { Backspace } from '@phosphor-icons/react'
import { motion, useAnimationControls } from 'motion/react'
import { useEffect } from 'react'
import { cx } from './ui'
import { t } from '../lib/i18n'

export const PIN_LENGTH = 6

export function PinPad({
  title,
  sub,
  value,
  onChange,
  error,
  disabled,
}: {
  title: string
  sub?: string
  value: string
  onChange: (v: string) => void
  error?: string | null
  disabled?: boolean
}) {
  const shake = useAnimationControls()
  useEffect(() => {
    if (error) void shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } })
  }, [error, shake])

  const press = (d: string) => {
    if (disabled || value.length >= PIN_LENGTH) return
    navigator.vibrate?.(8)
    onChange(value + d)
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-[24px] font-[650] tracking-[-0.02em]">{title}</h1>
      <p className="mt-1.5 min-h-[22px] text-center text-[15px] text-muted">{error ? <span className="text-danger">{error}</span> : sub}</p>
      <motion.div animate={shake} className="my-8 flex gap-3.5" aria-label={t('pinEntered', { n: value.length })}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={cx(
              'size-3.5 rounded-full transition-colors duration-150',
              i < value.length ? 'bg-accent' : 'bg-surface-2 ring-1 ring-line',
            )}
          />
        ))}
      </motion.div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Key key={d} onClick={() => press(d)} disabled={disabled}>
            {d}
          </Key>
        ))}
        <span />
        <Key onClick={() => press('0')} disabled={disabled}>
          0
        </Key>
        <button
          aria-label={t('deleteDigit')}
          onClick={() => onChange(value.slice(0, -1))}
          className="grid size-[76px] place-items-center rounded-full text-muted active:bg-surface-2"
        >
          <Backspace size={26} />
        </button>
      </div>
    </div>
  )
}

function Key({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="grid size-[76px] place-items-center rounded-full bg-surface text-[30px] font-[450] shadow-card transition-transform active:scale-90 active:bg-surface-2 disabled:opacity-40"
    >
      {children}
    </button>
  )
}
