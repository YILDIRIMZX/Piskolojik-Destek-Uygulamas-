import { CaretLeft, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[transform,background-color,opacity] duration-200 active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100',
        size === 'sm' && 'h-9 px-4 text-[14px]',
        size === 'md' && 'h-11 px-5 text-[15px]',
        size === 'lg' && 'h-[52px] px-6 text-[16px]',
        variant === 'primary' && 'bg-accent text-accent-ink',
        variant === 'secondary' && 'bg-surface-2 text-ink',
        variant === 'ghost' && 'text-accent',
        variant === 'danger' && 'bg-danger text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={cx(
        'grid size-10 place-items-center rounded-full bg-surface-2 text-ink transition-transform active:scale-90',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'block w-full rounded-card bg-surface text-left shadow-card',
        onClick && 'transition-transform duration-200 active:scale-[0.985]',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/** iOS-style screen: sticky glass bar with a back button, large title below. */
export function Screen({
  title,
  onBack,
  action,
  children,
  bottomPad = true,
}: {
  title: string
  onBack?: () => void
  action?: ReactNode
  children: ReactNode
  bottomPad?: boolean
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="glass pt-safe sticky top-0 z-20 border-b border-line">
        <div className="flex h-11 items-center justify-between px-3">
          {onBack ? (
            <button onClick={onBack} className="flex items-center gap-0.5 rounded-full py-2 pr-3 text-[16px] text-accent">
              <CaretLeft size={22} weight="bold" />
              Geri
            </button>
          ) : (
            <span />
          )}
          {action}
        </div>
      </div>
      <div className={cx('mx-auto w-full max-w-xl flex-1 px-4', bottomPad && 'pb-32')}>
        <h1 className="pt-3 pb-5 text-[30px] leading-tight font-[680] tracking-[-0.03em]">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="pb-safe relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-sheet bg-surface"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-2" />
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <h2 className="text-[19px] font-[650] tracking-[-0.01em]">{title}</h2>
              <IconButton label="Kapat" onClick={onClose} className="size-8">
                <X size={16} weight="bold" />
              </IconButton>
            </div>
            <div className="no-scrollbar overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** `group` renders a fieldset-like div for button groups (a <label> would forward clicks to the first button). */
export function Field({
  label,
  hint,
  group,
  children,
}: {
  label: string
  hint?: string
  group?: boolean
  children: ReactNode
}) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className="mb-4 flex flex-col gap-1.5" {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span className="text-[14px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </Tag>
  )
}

export const inputClass =
  'w-full rounded-field border border-line bg-surface-2 px-3.5 py-3 text-[16px] text-ink placeholder:text-muted/80 outline-none focus:border-accent'

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left"
    >
      <span>
        <span className="block text-[16px]">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>}
      </span>
      <span
        className={cx(
          'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-surface-2 ring-1 ring-line',
        )}
      >
        <span
          className={cx(
            'absolute top-[2px] size-[27px] rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
          )}
        />
      </span>
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="grid rounded-full bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 rounded-full text-[14px] font-medium transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-accent-soft text-accent">{icon}</div>
      <p className="text-[17px] font-[620]">{title}</p>
      <p className="mt-1 max-w-[30ch] text-[15px] text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      {title && <h2 className="mb-2 px-1 text-[13px] font-medium text-muted">{title}</h2>}
      <div className="rounded-card bg-surface px-4 shadow-card [&>*+*]:border-t [&>*+*]:border-line">{children}</div>
    </section>
  )
}

export function Row({
  icon,
  title,
  sub,
  onClick,
  trailing,
}: {
  icon?: ReactNode
  title: string
  sub?: string
  onClick?: () => void
  trailing?: ReactNode
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3.5 text-left active:opacity-60">
      {icon && <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px]">{title}</span>
        {sub && <span className="block truncate text-[13.5px] text-muted">{sub}</span>}
      </span>
      {trailing}
    </button>
  )
}
