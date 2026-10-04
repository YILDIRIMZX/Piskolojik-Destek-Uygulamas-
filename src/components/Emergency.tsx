import { Phone, Lifebuoy } from '@phosphor-icons/react'
import { Sheet } from './ui'

export function EmergencyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full whitespace-nowrap bg-danger/12 px-3.5 text-[14px] font-medium text-danger active:scale-95"
    >
      <Lifebuoy size={18} weight="bold" />
      Acil yardım
    </button>
  )
}

export function EmergencySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Şu an zor bir an mı?">
      <p className="text-[15.5px] leading-relaxed text-muted">
        Kendine ya da bir başkasına zarar verme düşüncen varsa veya kendini güvende hissetmiyorsan, lütfen hemen yardım iste.
        Bu uygulama acil durumlar için değil.
      </p>
      <a
        href="tel:112"
        className="mt-5 flex h-[56px] items-center justify-center gap-2.5 rounded-full bg-danger text-[17px] font-semibold text-white active:scale-[0.98]"
      >
        <Phone size={22} weight="fill" />
        112'yi ara
      </a>
      <div className="mt-6 rounded-card bg-surface-2 p-4">
        <p className="text-[15px] font-[620]">Aramadan önce bir dakika</p>
        <ul className="mt-2 space-y-2 text-[15px] leading-snug text-muted">
          <li>Ayaklarını yere bastır. Etrafında gördüğün 5 şeyi say.</li>
          <li>Burnundan 4 saniye nefes al, 6 saniyede ver. Birkaç kez tekrarla.</li>
          <li>Güvendiğin birine yaz ya da onu ara. Yalnız kalmak zorunda değilsin.</li>
          <li>Kriz geçtikten sonra bir ruh sağlığı uzmanına başvurmayı düşün.</li>
        </ul>
      </div>
    </Sheet>
  )
}
