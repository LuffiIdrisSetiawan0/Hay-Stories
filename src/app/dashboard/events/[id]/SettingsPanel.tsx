'use client'

import { useActionState, useState, useSyncExternalStore } from 'react'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { REVEAL_MODES, type RevealMode } from '@/lib/catalog'
import {
  updateAlbumSettings,
  updateAlbumStatus,
  type AlbumSettingsValues,
} from './actions'
import styles from './Manage.module.css'

type GalleryVisibility = 'guests' | 'host_only'

interface SettingsPanelProps {
  eventId: string
  initialTitle: string
  initialEventDate: string | null
  initialRevealMode: RevealMode
  initialRevealAt: string | null
  initialGalleryVisibility: GalleryVisibility
  initialStatus: string
  revealLocked: boolean
  reactivationAllowed: boolean
}

function calendarDateFromInstant(value: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function localDateTimeFromInstant(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function instantFromLocalDateTime(value: string) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

function currentTimeZoneLabel() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const shortName = new Intl.DateTimeFormat('id-ID', { timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value

  if (zone && shortName) return `${zone} (${shortName})`
  return zone || shortName || 'zona waktu perangkat'
}

function sameSettings(a: AlbumSettingsValues, b: AlbumSettingsValues) {
  return (
    a.title === b.title &&
    a.eventDate === b.eventDate &&
    a.revealMode === b.revealMode &&
    a.revealAt === b.revealAt &&
    a.galleryVisibility === b.galleryVisibility
  )
}

function subscribeToBrowserReady() {
  return () => undefined
}

/** Tampilkan instant reveal dalam zona waktu perangkat host. */
export function LocalDateTime({ value }: { value: string }) {
  const browserReady = useSyncExternalStore(
    subscribeToBrowserReady,
    () => true,
    () => false
  )
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return <span>Waktu tidak valid</span>

  return (
    <time dateTime={value} title={browserReady ? currentTimeZoneLabel() : 'UTC'}>
      {new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
        ...(browserReady ? {} : { timeZone: 'UTC' }),
      }).format(date)}
    </time>
  )
}

export default function SettingsPanel({
  eventId,
  initialTitle,
  initialEventDate,
  initialRevealMode,
  initialRevealAt,
  initialGalleryVisibility,
  initialStatus,
  revealLocked,
  reactivationAllowed,
}: SettingsPanelProps) {
  const initialEventDateValue = calendarDateFromInstant(initialEventDate)
  const initialRevealAtValue = initialRevealAt ?? ''
  const [settingsState, settingsAction, settingsPending] = useActionState(
    updateAlbumSettings,
    null
  )
  const [statusState, statusAction, statusPending] = useActionState(updateAlbumStatus, null)
  const browserReady = useSyncExternalStore(
    subscribeToBrowserReady,
    () => true,
    () => false
  )

  const [title, setTitle] = useState(initialTitle)
  const [eventDate, setEventDate] = useState(initialEventDateValue)
  const [revealMode, setRevealMode] = useState<RevealMode>(initialRevealMode)
  const [revealAtOverride, setRevealAtOverride] = useState<string | null>(null)
  const [revealAtInstant, setRevealAtInstant] = useState(initialRevealAtValue)
  const [revealAtInFuture, setRevealAtInFuture] = useState(Boolean(initialRevealAtValue))
  const [galleryVisibility, setGalleryVisibility] =
    useState<GalleryVisibility>(initialGalleryVisibility)
  const initialSavedValues: AlbumSettingsValues = {
    title: initialTitle,
    eventDate: initialEventDateValue,
    revealMode: initialRevealMode,
    revealAt: initialRevealMode === 'scheduled' ? initialRevealAtValue : '',
    galleryVisibility: initialGalleryVisibility,
  }
  const [titleTouched, setTitleTouched] = useState(false)
  const [confirmingForStatus, setConfirmingForStatus] = useState<string | null>(null)

  /*
   * Server snapshot selalu kosong agar HTML stabil. Sesudah hydration, instant
   * dari database diterjemahkan dengan zona waktu browser, bukan deployment.
   */
  const revealAtLocal =
    revealAtOverride ?? (browserReady ? localDateTimeFromInstant(initialRevealAt) : '')
  const timeZoneLabel = browserReady ? currentTimeZoneLabel() : 'zona waktu perangkat'
  const timeFieldReady = browserReady
  const savedValues =
    settingsState?.ok && settingsState.values ? settingsState.values : initialSavedValues

  const handleRevealAtChange = (value: string) => {
    const instant = instantFromLocalDateTime(value)
    setRevealAtOverride(value)
    setRevealAtInstant(instant)
    setRevealAtInFuture(Boolean(instant) && new Date(instant).getTime() > Date.now())
  }

  const currentValues: AlbumSettingsValues = {
    title: title.trim(),
    eventDate,
    revealMode,
    revealAt: revealMode === 'scheduled' ? revealAtInstant : '',
    galleryVisibility,
  }
  const dirty = !sameSettings(currentValues, savedValues)
  const titleError =
    titleTouched && title.trim().length < 3
      ? 'Nama acara minimal 3 karakter.'
      : title.trim().length > 80
        ? 'Nama acara maksimal 80 karakter.'
        : null
  const revealTimeError =
    !revealLocked && revealMode === 'scheduled'
      ? !revealAtLocal
        ? 'Tentukan tanggal dan jam reveal.'
        : !revealAtInFuture
          ? 'Waktu reveal harus berada di masa depan.'
          : null
      : null
  const formValid =
    title.trim().length >= 3 &&
    title.trim().length <= 80 &&
    !revealTimeError &&
    (revealMode !== 'scheduled' || timeFieldReady)
  const showSettingsSuccess = Boolean(settingsState?.ok && !dirty)

  const effectiveStatus = statusState?.ok && statusState.status ? statusState.status : initialStatus
  const archived = effectiveStatus === 'archived'
  const statusActionSupported = effectiveStatus === 'active' || archived
  const statusIntent = archived ? 'reactivate' : 'archive'
  const confirmingStatus = confirmingForStatus === effectiveStatus

  return (
    <section id="pengaturan" className={`${styles.card} ${styles.settingsCard}`}>
      <div className={styles.settingsHeading}>
        <span className={styles.settingsIcon} aria-hidden="true">
          <Settings2 size={18} />
        </span>
        <div>
          <h2 className={styles.cardTitle}>Pengaturan album</h2>
          <p className={styles.settingsIntro}>
            Ubah informasi acara, waktu reveal, dan siapa yang boleh melihat galeri.
          </p>
        </div>
      </div>

      <form action={settingsAction} className={styles.settingsForm}>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="revealMode" value={revealMode} />
        <input
          type="hidden"
          name="revealAt"
          value={revealMode === 'scheduled' ? revealAtInstant : ''}
        />
        <input type="hidden" name="galleryVisibility" value={galleryVisibility} />

        <fieldset className={styles.settingsGroup}>
          <legend className={styles.settingsLegend}>Informasi acara</legend>
          <div className={styles.settingsGrid}>
            <div className={styles.settingsField}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel} htmlFor="settings-title">
                  Nama acara
                </label>
                <span className={styles.fieldCounter}>{title.length}/80</span>
              </div>
              <input
                id="settings-title"
                name="title"
                className={styles.settingsInput}
                value={title}
                minLength={3}
                maxLength={80}
                required
                aria-invalid={Boolean(titleError || settingsState?.fieldErrors?.title)}
                aria-describedby="settings-title-help"
                onChange={(event) => {
                  setTitle(event.target.value)
                  setTitleTouched(true)
                }}
                onBlur={() => setTitle((value) => value.trim())}
              />
              <span
                id="settings-title-help"
                className={
                  titleError || settingsState?.fieldErrors?.title
                    ? styles.fieldError
                    : styles.fieldHelp
                }
              >
                {titleError ||
                  settingsState?.fieldErrors?.title ||
                  'Nama ini tampil di halaman QR dan galeri tamu.'}
              </span>
            </div>

            <div className={styles.settingsField}>
              <label className={styles.fieldLabel} htmlFor="settings-date">
                Tanggal acara <span className={styles.optional}>(opsional)</span>
              </label>
              <div className={styles.inputWithIcon}>
                <CalendarDays size={16} aria-hidden="true" />
                <input
                  id="settings-date"
                  name="eventDate"
                  type="date"
                  className={styles.settingsInput}
                  value={eventDate}
                  aria-invalid={Boolean(settingsState?.fieldErrors?.eventDate)}
                  aria-describedby="settings-date-help"
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </div>
              <span
                id="settings-date-help"
                className={
                  settingsState?.fieldErrors?.eventDate ? styles.fieldError : styles.fieldHelp
                }
              >
                {settingsState?.fieldErrors?.eventDate || 'Kosongkan jika tanggal belum pasti.'}
              </span>
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.settingsGroup}>
          <legend className={styles.settingsLegend}>Waktu foto terbuka</legend>
          <div className={styles.settingsOptions}>
            {REVEAL_MODES.map((mode) => (
              <label
                key={mode.id}
                className={`${styles.settingsOption} ${
                  revealMode === mode.id ? styles.settingsOptionSelected : ''
                } ${revealLocked ? styles.settingsOptionDisabled : ''}`}
              >
                <input
                  className={styles.srOnly}
                  type="radio"
                  name="reveal-mode-choice"
                  value={mode.id}
                  checked={revealMode === mode.id}
                  disabled={revealLocked || settingsPending}
                  onChange={() => setRevealMode(mode.id)}
                />
                <span className={styles.optionRadio} aria-hidden="true">
                  <span />
                </span>
                <span>
                  <strong>{mode.label}</strong>
                  <small>{mode.description}</small>
                </span>
              </label>
            ))}
          </div>

          {revealLocked ? (
            <div className={styles.settingsNotice}>
              <LockKeyhole size={17} aria-hidden="true" />
              <p>
                <strong>Reveal sudah terkunci.</strong> Foto pernah tersedia untuk dilihat, jadi
                waktunya tidak dapat dimundurkan atau disembunyikan lagi.
              </p>
            </div>
          ) : revealMode === 'scheduled' ? (
            <div className={`${styles.settingsField} ${styles.revealDateField}`}>
              <label className={styles.fieldLabel} htmlFor="settings-reveal-at">
                Tanggal dan jam reveal
              </label>
              <input
                id="settings-reveal-at"
                type="datetime-local"
                className={styles.settingsInput}
                value={revealAtLocal}
                disabled={!timeFieldReady || settingsPending}
                required
                aria-invalid={Boolean(revealTimeError || settingsState?.fieldErrors?.revealAt)}
                aria-describedby="settings-reveal-help"
                onChange={(event) => handleRevealAtChange(event.target.value)}
              />
              <span
                id="settings-reveal-help"
                className={
                  revealTimeError || settingsState?.fieldErrors?.revealAt
                    ? styles.fieldError
                    : styles.fieldHelp
                }
              >
                {revealTimeError ||
                  settingsState?.fieldErrors?.revealAt ||
                  `Mengikuti ${timeZoneLabel}; tamu di zona lain melihat momen yang sama.`}
              </span>
            </div>
          ) : revealMode === 'immediate' ? (
            <div className={`${styles.settingsNotice} ${styles.settingsNoticeWarm}`}>
              <Sparkles size={17} aria-hidden="true" />
              <p>
                <strong>Pilihan ini bersifat permanen.</strong> Setelah disimpan, reveal tidak
                dapat dijadwalkan ulang atau dikembalikan ke mode manual.
              </p>
            </div>
          ) : null}

          {settingsState?.fieldErrors?.revealMode && (
            <p className={styles.fieldError}>{settingsState.fieldErrors.revealMode}</p>
          )}
        </fieldset>

        <fieldset className={styles.settingsGroup}>
          <legend className={styles.settingsLegend}>Akses galeri</legend>
          <div className={`${styles.settingsOptions} ${styles.visibilityOptions}`}>
            <label
              className={`${styles.settingsOption} ${
                galleryVisibility === 'guests' ? styles.settingsOptionSelected : ''
              }`}
            >
              <input
                className={styles.srOnly}
                type="radio"
                name="gallery-visibility-choice"
                value="guests"
                checked={galleryVisibility === 'guests'}
                disabled={settingsPending}
                onChange={() => setGalleryVisibility('guests')}
              />
              <span className={styles.optionIcon} aria-hidden="true">
                <Eye size={17} />
              </span>
              <span>
                <strong>Tamu & host</strong>
                <small>Tamu dapat melihat foto setelah reveal.</small>
              </span>
            </label>

            <label
              className={`${styles.settingsOption} ${
                galleryVisibility === 'host_only' ? styles.settingsOptionSelected : ''
              }`}
            >
              <input
                className={styles.srOnly}
                type="radio"
                name="gallery-visibility-choice"
                value="host_only"
                checked={galleryVisibility === 'host_only'}
                disabled={settingsPending}
                onChange={() => setGalleryVisibility('host_only')}
              />
              <span className={styles.optionIcon} aria-hidden="true">
                <EyeOff size={17} />
              </span>
              <span>
                <strong>Hanya host</strong>
                <small>Tamu tetap dapat memotret, tetapi tidak melihat galeri.</small>
              </span>
            </label>
          </div>
          {settingsState?.fieldErrors?.galleryVisibility && (
            <p className={styles.fieldError}>{settingsState.fieldErrors.galleryVisibility}</p>
          )}
        </fieldset>

        <div className={styles.settingsFooter}>
          <div className={styles.settingsFeedback} aria-live="polite">
            {showSettingsSuccess ? (
              <p className={styles.settingsSuccess}>{settingsState?.message}</p>
            ) : settingsState && !settingsState.ok ? (
              <p className={styles.settingsError} role="alert">
                {settingsState.message}
              </p>
            ) : dirty ? (
              <p>Ada perubahan yang belum disimpan.</p>
            ) : (
              <p>Semua perubahan tersimpan.</p>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={settingsPending || !dirty || !formValid}
          >
            {settingsPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Menyimpan…
              </>
            ) : (
              'Simpan perubahan'
            )}
          </button>
        </div>
      </form>

      <div className={styles.lifecycleSettings}>
        <div className={styles.lifecycleCopy}>
          <span
            className={`${styles.lifecycleIcon} ${archived ? styles.lifecycleIconActive : ''}`}
            aria-hidden="true"
          >
            {archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
          </span>
          <div>
            <h3>{archived ? 'Album sedang diarsipkan' : 'Arsipkan album'}</h3>
            <p>
              {archived
                ? reactivationAllowed
                  ? 'Aktifkan kembali untuk menerima tamu dan jepretan dengan QR yang sama.'
                  : 'Masa aktif album sudah habis. Foto tetap aman, tetapi akses tamu tidak dapat diaktifkan kembali.'
                : effectiveStatus === 'active'
                  ? 'Tamu dan jepretan baru tidak akan diterima. Foto, data tamu, dan tautan tetap tersimpan.'
                  : 'Status album ini dikelola oleh lifecycle dan tidak dapat diubah dari sini.'}
            </p>
          </div>
        </div>

        {statusActionSupported && (!archived || reactivationAllowed) && (
          <form action={statusAction} className={styles.lifecycleForm}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="intent" value={statusIntent} />

            {confirmingStatus ? (
              <div className={styles.lifecycleConfirm}>
                <p>
                  {archived
                    ? 'Buka kembali akses QR dan izinkan tamu mengambil foto?'
                    : 'Hentikan penerimaan tamu dan jepretan baru untuk sementara?'}
                </p>
                <div className={styles.lifecycleButtons}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={statusPending}
                    onClick={() => setConfirmingForStatus(null)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={archived ? 'btn btn-primary' : `btn ${styles.archiveConfirmButton}`}
                    disabled={statusPending}
                  >
                    {statusPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Memproses…
                      </>
                    ) : archived ? (
                      'Ya, aktifkan kembali'
                    ) : (
                      'Ya, arsipkan'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={archived ? 'btn btn-primary' : `btn ${styles.archiveButton}`}
                onClick={() => setConfirmingForStatus(effectiveStatus)}
              >
                {archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                {archived ? 'Aktifkan kembali' : 'Arsipkan album'}
              </button>
            )}
          </form>
        )}

        {statusState?.error && (
          <p className={styles.lifecycleError} role="alert">
            {statusState.error}
          </p>
        )}
        {statusState?.ok && statusState.message && (
          <p className={styles.lifecycleSuccess} role="status">
            {statusState.message}
          </p>
        )}
      </div>
    </section>
  )
}
