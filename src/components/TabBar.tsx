import { BookOpenText, ChatsCircle, NotePencil, SunHorizon } from '@phosphor-icons/react'
import type { Tab } from '../nav'
import { cx } from './ui'
import { t, type Key } from '../lib/i18n'

const TABS: { id: Tab; label: Key; Icon: typeof SunHorizon }[] = [
  { id: 'home', label: 'tabHome', Icon: SunHorizon },
  { id: 'sessions', label: 'tabSessions', Icon: ChatsCircle },
  { id: 'journal', label: 'tabJournal', Icon: NotePencil },
  { id: 'files', label: 'tabFiles', Icon: BookOpenText },
]

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),14px)]">
      <div className="glass pointer-events-auto grid w-full max-w-md grid-cols-4 rounded-full border border-line p-1.5 shadow-card">
        {TABS.map(({ id, label, Icon }) => {
          const on = id === active
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors duration-200',
                on ? 'bg-accent-soft text-accent-deep' : 'text-muted',
              )}
            >
              <Icon size={23} weight={on ? 'fill' : 'regular'} />
              {t(label)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
