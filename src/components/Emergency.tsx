import { Phone, Lifebuoy } from '@phosphor-icons/react'
import { Sheet } from './ui'
import { t } from '../lib/i18n'

export function EmergencyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full whitespace-nowrap bg-danger/12 px-3.5 text-[14px] font-medium text-danger active:scale-95"
    >
      <Lifebuoy size={18} weight="bold" />
      {t('emergency')}
    </button>
  )
}

export function EmergencySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t('emergencyTitle')}>
      <p className="text-[15.5px] leading-relaxed text-muted">
        {t('emergencyText')}
      </p>
      <a
        href="tel:112"
        className="mt-5 flex h-[56px] items-center justify-center gap-2.5 rounded-full bg-danger text-[17px] font-semibold text-white active:scale-[0.98]"
      >
        <Phone size={22} weight="fill" />
        {t('emergencyCall')}
      </a>
      <div className="mt-6 rounded-card bg-surface-2 p-4">
        <p className="text-[15px] font-[620]">{t('emergencyBefore')}</p>
        <ul className="mt-2 space-y-2 text-[15px] leading-snug text-muted">
          <li>{t('emergencyStep1')}</li>
          <li>{t('emergencyStep2')}</li>
          <li>{t('emergencyStep3')}</li>
          <li>{t('emergencyStep4')}</li>
        </ul>
      </div>
    </Sheet>
  )
}
