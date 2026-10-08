import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmergencySheet } from './components/Emergency'
import { TabBar } from './components/TabBar'
import { Button, Sheet } from './components/ui'
import { flush, getVault, hasVault, lock, useVault, wipe } from './lib/store'
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
import { Personality } from './screens/Personality'
import { ToolScreen, ToolsLibrary } from './screens/Tools'
import { t, useLang } from './lib/i18n'

const TABS: Tab[] = ['home', 'sessions', 'journal', 'files']
const AUTO_LOCK_MS = 2 * 60_000

export default function App() {
  // Re-renders the whole tree when the language changes; components read strings with t().
  const lang = useLang()
  const vault = useVault()
  const [exists, setExists] = useState<boolean | null>(null)
  const [forgot, setForgot] = useState(false)

  useEffect(() => {
    void hasVault().then(setExists)
  }, [vault])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // iOS may leave the page shifted after the keyboard closes; the page never scrolls, so snap it back.
  useEffect(() => {
    const reset = () => setTimeout(() => window.scrollTo(0, 0), 60)
    document.addEventListener('focusout', reset)
    return () => document.removeEventListener('focusout', reset)
  }, [])

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
        <Sheet open={forgot} onClose={() => setForgot(false)} title={t('forgotTitle')}>
          <p className="text-[15.5px] leading-relaxed text-muted">
            {t('forgotText')}
          </p>
          <Button variant="danger" size="lg" className="mt-6 mb-2 w-full" onClick={() => void wipe().then(() => setForgot(false))}>
            {t('forgotWipe')}
          </Button>
        </Sheet>
      </>
    )
  return <Shell />
}

function Shell() {
  const reduce = useReducedMotion()
  // New users without any history start with the personality test (they can skip it).
  const [stack, setStack] = useState<Route[]>(() => {
    const v = getVault()
    const fresh = v && !v.clientFile.trim() && !v.reports.length && !v.profile && !v.profileSkipped
    return fresh ? [{ name: 'home' }, { name: 'personality', first: true }] : [{ name: 'home' }]
  })
  const [emergency, setEmergency] = useState(false)
  const [entry, setEntry] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const toTop = () => scroller.current?.scrollTo(0, 0)
  const route = stack[stack.length - 1]
  const rootTab = (stack[0].name as Tab) ?? 'home'

  const go = useCallback((r: Route) => {
    setStack((s) => [...s, r])
    toTop()
  }, [])
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
    toTop()
  }, [])
  const tab = useCallback((t: Tab) => {
    setStack([{ name: t }])
    toTop()
  }, [])

  const nav: Nav = useMemo(
    () => ({ route, go, back, tab, openEmergency: () => setEmergency(true), newEntry: () => setEntry(true) }),
    [route, go, back, tab],
  )

  const isRoot = TABS.includes(route.name as Tab)
  const key = `${stack.length}-${route.name}-${'id' in route ? route.id : 'kind' in route ? route.kind : ''}`

  return (
    <NavContext.Provider value={nav}>
      <div className="relative h-full overflow-hidden">
      <div ref={scroller} className="relative h-full overflow-y-auto overscroll-contain">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.main
          key={key}
          initial={reduce ? { opacity: 0 } : isRoot ? { opacity: 0 } : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-full"
        >
          <Screen route={route} />
        </motion.main>
      </AnimatePresence>
      </div>
      {isRoot && <TabBar active={rootTab} onChange={tab} />}
      </div>
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
    case 'tool':
      return <ToolScreen kind={route.kind} />
    case 'toolsLibrary':
      return <ToolsLibrary />
    case 'personality':
      return <Personality first={route.first} />
    case 'settings':
      return <Settings />
  }
}
