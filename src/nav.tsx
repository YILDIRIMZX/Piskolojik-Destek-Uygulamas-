import { createContext, useContext } from 'react'
import type { ToolKind } from './lib/types'

export type Tab = 'home' | 'sessions' | 'journal' | 'files'

export type Route =
  | { name: Tab }
  | { name: 'session'; id: string }
  | { name: 'review'; id: string }
  | { name: 'report'; id: string }
  | { name: 'clientFile' }
  | { name: 'cycle' }
  | { name: 'tool'; kind: ToolKind }
  | { name: 'toolsLibrary' }
  | { name: 'personality'; first?: boolean }
  | { name: 'settings' }

export interface Nav {
  route: Route
  go: (r: Route) => void
  back: () => void
  tab: (t: Tab) => void
  openEmergency: () => void
  /** Opens the moment-log tool (the counselor may have renamed it). */
  newEntry: () => void
}

export const NavContext = createContext<Nav | null>(null)

export const useNav = () => {
  const n = useContext(NavContext)
  if (!n) throw new Error('NavContext missing')
  return n
}
