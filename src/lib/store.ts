import { del, get, set } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import { deriveKey, newSalt, open, seal, type Sealed } from './crypto'
import { newVault, type Vault } from './types'

const VAULT_KEY = 'seans-vault'
const ATTEMPTS_KEY = 'seans-attempts'

let state: Vault | null = null
let key: CryptoKey | null = null
let salt: Uint8Array | null = null
let saveTimer: number | undefined
let saving: Promise<void> = Promise.resolve()
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

export const hasVault = async () => (await get<Sealed>(VAULT_KEY)) !== undefined

export async function createVault(pin: string, initial: Vault = newVault()) {
  salt = newSalt()
  key = await deriveKey(pin, salt)
  state = initial
  await persist()
  navigator.storage?.persist?.().catch(() => {})
  emit()
}

export interface Attempts {
  count: number
  lockedUntil: number
}

export const getAttempts = async (): Promise<Attempts> =>
  (await get<Attempts>(ATTEMPTS_KEY)) ?? { count: 0, lockedUntil: 0 }

export async function unlock(pin: string): Promise<boolean> {
  const sealed = await get<Sealed>(VAULT_KEY)
  if (!sealed) return false
  try {
    const res = await open<Vault>(pin, sealed)
    state = { ...newVault(), ...res.data, settings: { ...newVault().settings, ...res.data.settings } }
    key = res.key
    salt = res.salt
    await set(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 })
    emit()
    return true
  } catch {
    const a = await getAttempts()
    const count = a.count + 1
    // After 5 wrong PINs, wait 30 s, doubling with each further miss.
    const lockedUntil = count >= 5 ? Date.now() + 30_000 * 2 ** (count - 5) : 0
    await set(ATTEMPTS_KEY, { count, lockedUntil })
    return false
  }
}

export function lock() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    void persist()
  }
  state = null
  key = null
  emit()
}

export async function changePin(pin: string) {
  if (!state) return
  salt = newSalt()
  key = await deriveKey(pin, salt)
  await persist()
}

export async function wipe() {
  await del(VAULT_KEY)
  await del(ATTEMPTS_KEY)
  state = null
  key = null
  emit()
}

async function persist() {
  if (!state || !key || !salt) return
  const snapshot = state
  const k = key
  const s = salt
  saving = saving.then(async () => {
    await set(VAULT_KEY, await seal(k, s, snapshot))
  })
  return saving
}

export function update(fn: (v: Vault) => Vault) {
  if (!state) return
  state = fn(state)
  emit()
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined
    void persist()
  }, 250)
}

/** Flush pending writes right away (before the app goes to background). */
export function flush() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = undefined
    return persist()
  }
  return saving
}

export const getVault = () => state

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useVault(): Vault | null {
  return useSyncExternalStore(subscribe, () => state)
}

/** For screens that only render while unlocked. */
export function useV(): Vault {
  const v = useVault()
  if (!v) throw new Error('vault locked')
  return v
}
