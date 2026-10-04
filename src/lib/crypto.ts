// PIN-derived AES-GCM encryption for everything stored on the device.
const ITERATIONS = 600_000

const enc = new TextEncoder()
const dec = new TextDecoder()

export interface Sealed {
  v: 1
  salt: string
  iv: string
  ct: string
}

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const newSalt = () => crypto.getRandomValues(new Uint8Array(16))

export async function seal(key: CryptoKey, salt: Uint8Array, data: unknown): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)))
  return { v: 1, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) }
}

/** Throws when the PIN is wrong (AES-GCM authentication fails). */
export async function open<T>(pin: string, sealed: Sealed): Promise<{ data: T; key: CryptoKey; salt: Uint8Array }> {
  const salt = fromB64(sealed.salt)
  const key = await deriveKey(pin, salt)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.ct))
  return { data: JSON.parse(dec.decode(pt)) as T, key, salt }
}
