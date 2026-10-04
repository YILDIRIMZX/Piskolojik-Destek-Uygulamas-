import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmergencySheet } from './components/Emergency'
import { TabBar } from './components/TabBar'
import { Button, Sheet } from './components/ui'
import { flush, hasVault, lock, useVault, wipe } from './lib/store'
import { NavContext, type Nav, type Route, type Tab } from './nav'
import { ClientFile, Cycle, Files, ReportView } from './screens/Files'
import { Home } from './screens/Home'
import { Journal, NewEntrySheet } from './screens/Journal'
import { Lock } from './screens/Lock'
import { Onboarding } from './screens/Onboarding'
import { Review } from './screens/Review'
import { SessionChat } from './screens/SessionChat'
import { Sessions } from './screens/Sessions'
import { Settings } from './screens/Settings'
import { Breathe, Compassion, Underneath } from './screens/Tools'

const TABS: Tab[] = ['home', 'sessions', 'journal', 'files']
const AUTO_LOCK_MS = 2 * 60_000

export default function App() {
  const vault = useVault()
  const [exists, setExists] = useState<boolean | null>(null)
  const [forgot, setForgot] = useState(false)

  useEffect(() => {
    void hasVault().then(setExists)
  }, [vault])

  // Save on background, lock after two minutes away.
  useEffect(() => {
    let hiddenAt = 0
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        void flush()
      } else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) lock()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  if (exists === null) return null
  if (!vault && !exists) return <Onboarding />
  if (!vault)
    return (
      <>
        <Lock onForgot={() => setForgot(true)} />
        <Sheet open={forgot} onClose={() => setForgot(false)} title="PIN'i unuttun mu?">
          <p className="text-[15.5px] leading-relaxed text-muted">
            Veriler PIN kodunla şifreli olduğu için PIN olmadan açılamaz. Tek yol verileri silip baştan kurmak. Yedeğin varsa kurulumdan sonra
            Ayarlar'dan geri yükleyebilirsin.
          </p>
          <Button variant="danger" size="lg" className="mt-6 mb-2 w-full" onClick={() => void wipe().then(() => setForgot(false))}>
            Verileri sil ve baştan kur
          </Button>
        </Sheet>
      </>
    )
  return <Shell />
}

function Shell() {
  const reduce = useReducedMotion()
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }])
  const [emergency, setEmergency] = useState(false)
  const [entry, setEntry] = useState(false)
  const route = stack[stack.length - 1]
  const rootTab = (stack[0].name as Tab) ?? 'home'

  const go = useCallback((r: Route) => {
    setStack((s) => [...s, r])
    window.scrollTo(0, 0)
  }, [])
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
    window.scrollTo(0, 0)
  }, [])
  const tab = useCallback((t: Tab) => {
    setStack([{ name: t }])
    window.scrollTo(0, 0)
  }, [])

  const nav: Nav = useMemo(
    () => ({ route, go, back, tab, openEmergency: () => setEmergency(true), newEntry: () => setEntry(true) }),
    [route, go, back, tab],
  )

  const isRoot = TABS.includes(route.name as Tab)
  const key = `${stack.length}-${route.name}-${'id' in route ? route.id : ''}`

  return (
    <NavContext.Provider value={nav}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.main
          key={key}
          initial={reduce ? { opacity: 0 } : isRoot ? { opacity: 0 } : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[100dvh]"
        >
          <Screen route={route} />
        </motion.main>
      </AnimatePresence>
      {isRoot && <TabBar active={rootTab} onChange={tab} />}
      <EmergencySheet open={emergency} onClose={() => setEmergency(false)} />
      <NewEntrySheet open={entry} onClose={() => setEntry(false)} />
    </NavContext.Provider>
  )
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />
    case 'sessions':
      return <Sessions />
    case 'journal':
      return <Journal />
    case 'files':
      return <Files />
    case 'session':
      return <SessionChat id={route.id} />
    case 'review':
      return <Review id={route.id} />
    case 'report':
      return <ReportView id={route.id} />
    case 'clientFile':
      return <ClientFile />
    case 'cycle':
      return <Cycle />
    case 'breathe':
      return <Breathe />
    case 'compassion':
      return <Compassion />
    case 'underneath':
      return <Underneath />
    case 'tools':
      return <Home />
    case 'settings':
      return <Settings />
  }
}
