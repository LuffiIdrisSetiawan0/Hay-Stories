/** Kontrak bersama antara perekam tamu, route handler, dan dashboard host. */

export const GUESTBOOK_AUDIO_BUCKET = 'guestbook-audio'
export const GUESTBOOK_RECORDING_LIMIT_MS = 20_000
export const GUESTBOOK_MAX_DURATION_MS = 22_000
export const GUESTBOOK_MIN_DURATION_MS = 250
export const GUESTBOOK_MAX_AUDIO_BYTES = 2_097_152
export const GUESTBOOK_MIN_AUDIO_BYTES = 512
export const GUESTBOOK_NOTE_MAX_CHARS = 500
export const GUESTBOOK_SIGNED_PLAYBACK_TTL_SECONDS = 10 * 60

export const GUESTBOOK_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
] as const

export type GuestbookAudioMime = (typeof GUESTBOOK_AUDIO_MIME_TYPES)[number]

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function normalizeGuestbookAudioMime(value: unknown): GuestbookAudioMime | null {
  if (typeof value !== 'string') return null
  const normalized = value.split(';', 1)[0].trim().toLowerCase()
  return (GUESTBOOK_AUDIO_MIME_TYPES as readonly string[]).includes(normalized)
    ? (normalized as GuestbookAudioMime)
    : null
}

export function guestbookAudioExtension(mime: GuestbookAudioMime): string {
  if (mime === 'audio/webm') return 'webm'
  if (mime === 'audio/mp4') return 'm4a'
  return 'ogg'
}

/** Path selalu diturunkan dari dua UUID server-validated, bukan input klien. */
export function guestbookAudioPath(
  eventId: string,
  messageId: string,
  mime: GuestbookAudioMime
): string {
  return `${eventId.toLowerCase()}/${messageId.toLowerCase()}.${guestbookAudioExtension(mime)}`
}

/**
 * Hasil `undefined` berarti input tidak sah; `null` adalah catatan kosong yang
 * valid. Whitespace dinormalisasi sama seperti RPC database.
 */
export function normalizeGuestbookNote(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return undefined

  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return null
  if (normalized.length > GUESTBOOK_NOTE_MAX_CHARS) return undefined
  if (new TextEncoder().encode(normalized).byteLength > 2_000) return undefined
  if (/\p{Cc}/u.test(normalized)) return undefined
  return normalized
}

export interface GuestbookReserveResponse {
  ok: true
  messageId: string
  reusedReservation: boolean
  alreadyReady: boolean
  upload?: {
    bucket: typeof GUESTBOOK_AUDIO_BUCKET
    path: string
    token: string
  }
  limits: {
    maxBytes: typeof GUESTBOOK_MAX_AUDIO_BYTES
    maxDurationMs: typeof GUESTBOOK_MAX_DURATION_MS
    noteMaxChars: typeof GUESTBOOK_NOTE_MAX_CHARS
  }
}

export interface GuestbookFinalizeResponse {
  ok: true
  alreadyReady: boolean
  bytes: number
  durationMs: number
}
