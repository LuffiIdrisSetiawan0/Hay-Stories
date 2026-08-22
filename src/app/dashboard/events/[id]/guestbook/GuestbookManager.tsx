'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  Download,
  Loader2,
  MessageCircleHeart,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import type { HostGuestbookEntry } from '@/lib/guestbook'
import {
  deleteGuestbookEntry,
  setGuestbookEntryHidden,
} from '@/lib/guestbook-actions'
import styles from './GuestbookHost.module.css'

type Filter = 'active' | 'archived'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

function formatDuration(milliseconds: number | null) {
  if (!milliseconds || milliseconds < 0) return '—'
  const seconds = Math.round(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function formatSize(bytes: number | null) {
  if (!bytes || bytes < 1) return '—'
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function GuestbookManager({
  eventId,
  entries: initialEntries,
  total,
  page,
  pageSize,
  hasMore,
}: {
  eventId: string
  entries: HostGuestbookEntry[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [filter, setFilter] = useState<Filter>('active')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const activeCount = entries.filter((entry) => !entry.isHidden).length
  const archivedCount = entries.length - activeCount
  const visibleEntries = useMemo(
    () => entries.filter((entry) => (filter === 'archived' ? entry.isHidden : !entry.isHidden)),
    [entries, filter]
  )

  const moderate = (entry: HostGuestbookEntry) => {
    setWorkingId(entry.id)
    setFeedback(null)
    startTransition(async () => {
      const result = await setGuestbookEntryHidden(eventId, entry.id, !entry.isHidden)
      if (result.ok) {
        setEntries((current) =>
          current.map((candidate) =>
            candidate.id === entry.id
              ? { ...candidate, isHidden: Boolean(result.isHidden) }
              : candidate
          )
        )
      }
      setFeedback({ kind: result.ok ? 'ok' : 'error', text: result.message })
      setWorkingId(null)
      router.refresh()
    })
  }

  const remove = (entryId: string) => {
    setWorkingId(entryId)
    setFeedback(null)
    startTransition(async () => {
      const result = await deleteGuestbookEntry(eventId, entryId)
      if (result.ok) {
        setEntries((current) => current.filter((entry) => entry.id !== entryId))
        setConfirmingId(null)
      }
      setFeedback({ kind: result.ok ? 'ok' : 'error', text: result.message })
      setWorkingId(null)
      router.refresh()
    })
  }

  if (total === 0) {
    return (
      <section className={styles.empty}>
        <span className={styles.emptyIcon}>
          <MessageCircleHeart size={28} />
        </span>
        <h2>Belum ada ucapan</h2>
        <p>Begitu tamu mengirim rekaman, pesan suaranya akan muncul di halaman ini.</p>
      </section>
    )
  }

  const firstEntry = (page - 1) * pageSize + 1
  const lastEntry = Math.min(total, firstEntry + initialEntries.length - 1)

  return (
    <>
      <section className={styles.toolbar} aria-label="Filter guestbook">
        <div className={styles.filters}>
          <button
            type="button"
            className={filter === 'active' ? styles.filterActive : undefined}
            onClick={() => setFilter('active')}
          >
            Ucapan <span>{activeCount}</span>
          </button>
          <button
            type="button"
            className={filter === 'archived' ? styles.filterActive : undefined}
            onClick={() => setFilter('archived')}
          >
            Diarsipkan <span>{archivedCount}</span>
          </button>
        </div>
        <p>
          Menampilkan {firstEntry}–{lastEntry} dari {total}
        </p>
      </section>

      {feedback && (
        <p
          className={`${styles.feedback} ${
            feedback.kind === 'ok' ? styles.feedbackOk : styles.feedbackError
          }`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.kind === 'ok' && <Check size={15} />}
          {feedback.text}
        </p>
      )}

      {visibleEntries.length === 0 ? (
        <section className={styles.filteredEmpty}>
          <Archive size={22} />
          <p>{filter === 'archived' ? 'Belum ada ucapan yang diarsipkan.' : 'Semua ucapan di halaman ini sudah diarsipkan.'}</p>
        </section>
      ) : (
        <div className={styles.grid}>
          {visibleEntries.map((entry) => {
            const working = pending && workingId === entry.id
            return (
              <article key={entry.id} className={styles.entry}>
                <header className={styles.entryHeader}>
                  <span className={styles.avatar}>{initials(entry.guestName)}</span>
                  <div>
                    <h2>{entry.guestName}</h2>
                    <p>{formatDate(entry.createdAt)}</p>
                  </div>
                  {entry.isHidden && <span className={styles.archivedBadge}>Diarsipkan</span>}
                </header>

                <div className={styles.audioPanel}>
                  <div className={styles.audioMeta}>
                    <AudioLines size={17} />
                    <span>{formatDuration(entry.durationMs)}</span>
                    <span>·</span>
                    <span>{formatSize(entry.audioBytes)}</span>
                  </div>
                  {entry.audioUrl ? (
                    <>
                      <audio controls preload="none" src={entry.audioUrl} className={styles.audio}>
                        Browser ini tidak mendukung pemutar audio.
                      </audio>
                      <a
                        href={entry.audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.download}
                      >
                        <Download size={14} />
                        Buka rekaman
                      </a>
                    </>
                  ) : (
                    <p className={styles.audioUnavailable}>
                      Rekaman belum dapat diputar. Muat ulang halaman untuk membuat tautan baru.
                    </p>
                  )}
                </div>

                {entry.note && <p className={styles.note}>“{entry.note}”</p>}

                <footer className={styles.entryActions}>
                  <button
                    type="button"
                    onClick={() => moderate(entry)}
                    disabled={working}
                  >
                    {working ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : entry.isHidden ? (
                      <RotateCcw size={15} />
                    ) : (
                      <Archive size={15} />
                    )}
                    {entry.isHidden ? 'Pulihkan' : 'Arsipkan'}
                  </button>

                  {confirmingId === entry.id ? (
                    <div className={styles.confirmDelete}>
                      <span>Hapus permanen?</span>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={working}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        className={styles.deleteConfirm}
                        onClick={() => remove(entry.id)}
                        disabled={working}
                      >
                        {working && <Loader2 size={14} className="animate-spin" />}
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => setConfirmingId(entry.id)}
                      disabled={working}
                    >
                      <Trash2 size={15} />
                      Hapus
                    </button>
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <nav className={styles.pagination} aria-label="Halaman voice guestbook">
          {page > 1 ? (
            <Link
              href={
                page === 2
                  ? `/dashboard/events/${eventId}/guestbook`
                  : `/dashboard/events/${eventId}/guestbook?hal=${page - 1}`
              }
            >
              <ArrowLeft size={15} />
              Sebelumnya
            </Link>
          ) : (
            <span aria-disabled="true">
              <ArrowLeft size={15} />
              Sebelumnya
            </span>
          )}
          <strong>Halaman {page}</strong>
          {hasMore ? (
            <Link href={`/dashboard/events/${eventId}/guestbook?hal=${page + 1}`}>
              Berikutnya
              <ArrowRight size={15} />
            </Link>
          ) : (
            <span aria-disabled="true">
              Berikutnya
              <ArrowRight size={15} />
            </span>
          )}
        </nav>
      )}
    </>
  )
}
