'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Images, Loader2, SwitchCamera } from 'lucide-react'
import { DEFAULT_PRESET, FILM_PRESETS, getPreset, type FilmPreset } from '@/lib/catalog'
import { DEFAULT_FRAME, PHOTO_FRAMES, type FrameId } from '@/lib/frames'
import { FilmRenderer, fitWithin, processCapture, videoToBitmap } from '@/lib/film'
import { createClient } from '@/lib/supabase/client'
import styles from './Camera.module.css'

/**
 * Sisi terpanjang viewfinder.
 *
 * Ini ukuran KELUARAN render, bukan ukuran masukannya. Yang mahal justru
 * masukannya: tekstur video seukuran stream diunggah ke GPU tiap frame, berapa
 * pun kecilnya hasil yang digambar. Karena itu menurunkan angka ini saja tidak
 * menyembuhkan viewfinder yang tersendat — yang menentukan adalah resolusi
 * stream dan seberapa sering frame diunggah.
 *
 * Jepretan yang tersimpan tetap resolusi penuh; itu dirender sekali, bukan
 * tiap frame.
 */
const PREVIEW_LONG_EDGE = 900

/**
 * Resolusi yang diminta ke kamera. Ini yang menentukan resolusi foto tersimpan,
 * karena jepretan diambil langsung dari frame stream.
 *
 * 1440p, turun dari 4K. Bukan karena 4K tidak muat disimpan, tapi karena setiap
 * frame pratinjau harus mengunggah tekstur video seukuran itu ke GPU — dan di
 * HP kelas menengah viewfinder-nya patah-patah. 1440p menurunkan beban unggah
 * jadi sekitar 44% dari 4K, sambil tetap menyimpan 3,7 MP (cetak nyaman sampai
 * A4) alih-alih 2,1 MP seperti versi paling awal.
 *
 * Satu angka ini adalah tombol utamanya. Kalau masih tersendat, 1920x1080
 * berikutnya; kalau ternyata lapang, 4K bisa dicoba lagi.
 */
const STREAM_WIDTH = 2560
const STREAM_HEIGHT = 1440

/** Roll yang sudah terpasang saat kamera dibuka. Tamu bebas menggantinya. */
const INITIAL_PRESET = getPreset(DEFAULT_PRESET)!

type Phase =
  | { kind: 'starting' }
  | { kind: 'live' }
  | { kind: 'blocked'; title: string; body: string }

interface Props {
  eventId: string
  slug: string
  title: string
  guestName: string
  shotsUsed: number
  shotsLimit: number
}

export default function Camera({
  eventId,
  slug,
  title,
  guestName,
  shotsUsed: initialShotsUsed,
  shotsLimit,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<FilmRenderer | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef<{ kind: 'raf' | 'rvfc'; id: number } | null>(null)

  /*
   * Preset yang dipegang loop render, terpisah dari yang dipegang React.
   *
   * `render()` melempar kalau LUT-nya belum dimuat, jadi ref ini baru maju
   * setelah `loadPreset()` selesai. State-nya berubah lebih dulu supaya tombol
   * yang ditekan langsung terlihat aktif — di antara keduanya viewfinder masih
   * menggambar roll lama, dan itu memang yang benar.
   */
  const presetRef = useRef<FilmPreset>(INITIAL_PRESET)
  const [preset, setPreset] = useState<FilmPreset>(INITIAL_PRESET)

  const [phase, setPhase] = useState<Phase>({ kind: 'starting' })
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [frame, setFrame] = useState<FrameId>(DEFAULT_FRAME)
  const [shotsUsed, setShotsUsed] = useState(initialShotsUsed)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)
  const [lastShot, setLastShot] = useState<string | null>(null)

  /*
   * Pesan mengambang di atas viewfinder, bukan baris tetap di bawah layar.
   *
   * Kabar baik ("Tersimpan.") menghilang sendiri — membiarkannya menetap berarti
   * tamu membaca ulang hal yang sama sepanjang acara. Kegagalan bertahan sampai
   * jepretan berikutnya, karena itu yang perlu ditindaklanjuti.
   */
  const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    if (notice?.kind !== 'ok') return
    const timer = setTimeout(() => setNotice(null), 2200)
    return () => clearTimeout(timer)
  }, [notice])

  const remaining = Math.max(0, shotsLimit - shotsUsed)
  const rollEmpty = remaining === 0

  // Pratinjau kamera depan dicerminkan supaya tamu bisa mengarahkan dirinya
  // sendiri, seperti bercermin.
  const mirror = facing === 'user'

  // --- Loop render ---------------------------------------------------------

  const drawFrame = useCallback(() => {
    const video = videoRef.current
    const renderer = rendererRef.current
    if (!video || !renderer || video.readyState < 2) return

    const { width, height } = fitWithin(video.videoWidth, video.videoHeight, PREVIEW_LONG_EDGE)
    renderer.render(video, presetRef.current, width, height, {
      mirror,
      intensity: presetRef.current.strength,
      lumaLock: presetRef.current.lumaLock,
      contrast: presetRef.current.contrast,
    })
  }, [mirror])

  const stopLoop = useCallback(() => {
    const loop = loopRef.current
    if (!loop) return
    if (loop.kind === 'raf') cancelAnimationFrame(loop.id)
    else videoRef.current?.cancelVideoFrameCallback(loop.id)
    loopRef.current = null
  }, [])

  /*
   * Menggambar mengikuti frame KAMERA, bukan refresh layar.
   *
   * Kamera ponsel umumnya mengirim 30 fps sementara layarnya menyegarkan 60–120
   * kali sedetik. Dengan requestAnimationFrame, setiap frame kamera diunggah ke
   * GPU dua sampai empat kali — pekerjaan yang hasilnya identik dan langsung
   * dibuang. Pada tekstur 4K itulah yang membuat viewfinder patah-patah.
   *
   * requestVideoFrameCallback hanya menyala saat benar-benar ada frame baru.
   * Belum ada di semua browser lama, jadi rAF tetap disiapkan sebagai cadangan.
   */
  const startLoop = useCallback(() => {
    stopLoop()
    const video = videoRef.current
    if (!video) return

    if (typeof video.requestVideoFrameCallback === 'function') {
      const tick = () => {
        drawFrame()
        loopRef.current = { kind: 'rvfc', id: video.requestVideoFrameCallback(tick) }
      }
      loopRef.current = { kind: 'rvfc', id: video.requestVideoFrameCallback(tick) }
    } else {
      const tick = () => {
        drawFrame()
        loopRef.current = { kind: 'raf', id: requestAnimationFrame(tick) }
      }
      loopRef.current = { kind: 'raf', id: requestAnimationFrame(tick) }
    }
  }, [drawFrame, stopLoop])

  // --- Menyalakan kamera ---------------------------------------------------

  useEffect(() => {
    let cancelled = false

    async function start() {
      /*
       * getUserMedia hanya ada di konteks aman. Menguji ini lebih dulu penting
       * saat pengembangan: membuka aplikasi dari ponsel lewat http://192.168.x.x
       * membuat API-nya lenyap sama sekali, dan pesan bawaan browser tidak
       * memberi petunjuk sedikit pun soal sebabnya.
       */
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setPhase({
          kind: 'blocked',
          title: 'Kamera butuh koneksi aman',
          body: 'Browser hanya mengizinkan kamera lewat HTTPS atau localhost. Buka halaman ini dari alamat https.',
        })
        return
      }

      try {
        /*
         * `ideal`, bukan `exact`: perangkat yang tidak sanggup memberi yang
         * terdekat alih-alih menolak, jadi HP lama tetap jalan dan menyimpan
         * apa adanya.
         *
         * Rasio 16:9 memotong sensor 4:3 di atas-bawah, tapi itu pilihan
         * bingkai — bukan batas resolusi.
         */
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: STREAM_WIDTH },
            height: { ideal: STREAM_HEIGHT },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return

        video.srcObject = stream
        await video.play()

        // Konteks WebGL dibuat sekali lalu dipakai ulang saat kamera dibalik.
        // Membuatnya baru tiap kali akan menabrak batas jumlah konteks browser
        // setelah beberapa kali pembalikan.
        rendererRef.current ??= new FilmRenderer(canvas)
        await rendererRef.current.loadPreset(presetRef.current)

        if (cancelled) return
        setPhase({ kind: 'live' })
        startLoop()
      } catch (err) {
        if (cancelled) return

        const name = err instanceof Error ? err.name : ''

        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setPhase({
            kind: 'blocked',
            title: 'Izin kamera ditolak',
            body: 'Buka pengaturan situs di browsermu, izinkan kamera, lalu muat ulang halaman ini.',
          })
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setPhase({
            kind: 'blocked',
            title: 'Kamera tidak ditemukan',
            body: 'Perangkat ini tidak punya kamera yang bisa dipakai browser.',
          })
        } else {
          setPhase({
            kind: 'blocked',
            title: 'Kamera gagal dinyalakan',
            body:
              err instanceof Error && err.message
                ? err.message
                : 'Tutup aplikasi lain yang sedang memakai kamera, lalu muat ulang.',
          })
        }
      }
    }

    start()

    return () => {
      cancelled = true
      stopLoop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing, startLoop, stopLoop])

  // Konteks WebGL dilepas hanya saat komponennya benar-benar hilang, bukan tiap
  // kali kamera dibalik.
  useEffect(() => {
    return () => {
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  // Objek URL thumbnail dilepas saat diganti maupun saat komponen dibongkar.
  useEffect(() => {
    if (!lastShot) return
    return () => URL.revokeObjectURL(lastShot)
  }, [lastShot])

  // --- Ganti roll ----------------------------------------------------------

  const changePreset = useCallback(
    async (next: FilmPreset) => {
      if (busy || next.id === preset.id) return

      setPreset(next)
      try {
        await rendererRef.current?.loadPreset(next)
        presetRef.current = next
      } catch {
        // LUT gagal dimuat. Kembalikan pilihannya supaya tombol yang menyala
        // cocok dengan roll yang benar-benar sedang dirender.
        setPreset(presetRef.current)
        setNotice({ text: 'Roll itu gagal dimuat. Coba lagi.', kind: 'error' })
      }
    },
    [busy, preset.id]
  )

  // --- Menjepret -----------------------------------------------------------

  const capture = useCallback(async () => {
    const video = videoRef.current
    const renderer = rendererRef.current
    if (!video || !renderer || busy || rollEmpty || phase.kind !== 'live') return

    /*
     * Membalik kamera menghentikan stream lama sebelum yang baru siap, dan
     * selama jeda itu fase masih 'live'. Menjepret di tengahnya menghasilkan
     * frame kosong yang tetap memakan satu jatah roll, jadi kesiapan videonya
     * diperiksa langsung, bukan lewat state React.
     */
    if (video.readyState < 2) return

    setBusy(true)
    setNotice(null)
    setFlash(true)
    setTimeout(() => setFlash(false), 180)

    // Loop dihentikan supaya render resolusi penuh tidak berebut canvas dengan
    // viewfinder. Frame terakhir tetap terpampang — itu jeda "rana" yang memang
    // diinginkan.
    stopLoop()

    let photoId: string | null = null

    try {
      const bitmap = await videoToBitmap(video)
      let shot
      try {
        // Foto TIDAK dicerminkan sekalipun pratinjaunya iya. Cermin hanya
        // membantu tamu mengarahkan dirinya; hasil yang tersimpan harus sesuai
        // apa yang dilihat orang lain, termasuk tulisan di latar belakang.
        shot = await processCapture(renderer, bitmap, presetRef.current, { mirror: false })
      } finally {
        bitmap.close()
      }

      const claim = await fetch('/api/guest/shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          preset: presetRef.current.id,
          frame,
          width: shot.width,
          height: shot.height,
        }),
      })

      const claimBody = await claim.json()

      if (!claim.ok) {
        if (typeof claimBody.shotsUsed === 'number') setShotsUsed(claimBody.shotsUsed)
        setNotice({ text: claimBody.error ?? 'Gagal menyiapkan jepretan.', kind: 'error' })
        return
      }

      photoId = claimBody.photoId as string
      setShotsUsed(claimBody.shotsUsed)

      const supabase = createClient()
      const uploads = await Promise.all([
        supabase.storage
          .from('photos')
          .uploadToSignedUrl(claimBody.full.path, claimBody.full.token, shot.full, {
            contentType: 'image/jpeg',
          }),
        supabase.storage
          .from('photos')
          .uploadToSignedUrl(claimBody.thumb.path, claimBody.thumb.token, shot.thumb, {
            contentType: 'image/jpeg',
          }),
      ])

      const failed = uploads.find((u) => u.error)
      if (failed) throw new Error(failed.error?.message ?? 'Unggahan gagal.')

      const confirm = await fetch('/api/guest/shot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, photoId, bytes: shot.full.size }),
      })

      if (!confirm.ok) throw new Error('Foto terunggah tapi gagal dicatat.')

      photoId = null // sudah aman — jangan dibatalkan di blok finally
      setLastShot(URL.createObjectURL(shot.thumb))
      setNotice({ text: 'Tersimpan.', kind: 'ok' })
    } catch (err) {
      setNotice({
        text: err instanceof Error ? err.message : 'Jepretan gagal disimpan.',
        kind: 'error',
      })
    } finally {
      /*
       * Kembalikan jepretan yang sudah diklaim tapi tidak jadi foto. Tanpa ini,
       * unggahan yang putus di tengah tetap memakan satu frame dari roll tamu
       * tanpa memberi apa pun sebagai gantinya.
       */
      if (photoId) {
        try {
          await fetch('/api/guest/shot', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, photoId }),
          })
          setShotsUsed((n) => Math.max(0, n - 1))
        } catch {
          // Jaringannya memang sedang putus. Baris `pending` yang tertinggal
          // tidak pernah muncul di galeri, dan jepretannya kembali terhitung
          // benar begitu tamu memuat ulang halaman.
        }
      }

      setBusy(false)
      startLoop()
    }
  }, [busy, eventId, frame, phase.kind, rollEmpty, startLoop, stopLoop])

  // --- Tampilan ------------------------------------------------------------

  const controlsLocked = busy || phase.kind !== 'live'

  return (
    <main className={`${styles.page} surface-dark`}>
      {/*
        Viewfinder mengisi seluruh layar dan semua kontrol mengambang di atasnya.
        Sebelumnya lima jalur bertumpuk saling berebut tinggi layar, dan yang
        paling dikorbankan justru fotonya — padahal menilai roll film adalah
        satu-satunya alasan layar ini ada.
      */}
      <div className={styles.stage}>
        {/* Video sumber tidak pernah ditampilkan. Yang terlihat hanya canvas
            yang sudah melewati LUT, supaya tamu tidak sempat melihat versi
            mentahnya sedetik pun. */}
        <video ref={videoRef} playsInline muted className={styles.video} />

        {/*
          `contain`, bukan `cover`. Memenuhi layar akan memangkas tepi yang tetap
          ikut tersimpan — tamu membingkai satu hal dan mendapat hal lain. Pita
          hitam di atas-bawah justru berguna: di situlah kontrolnya duduk, tanpa
          menutupi foto.
        */}
        <canvas ref={canvasRef} className={styles.canvas} />

        {flash && <div className={styles.flash} />}

        {phase.kind === 'starting' && (
          <div className={styles.overlay}>
            <Loader2 size={22} className="animate-spin" />
            <p className={styles.overlayBody}>Menyalakan kamera…</p>
          </div>
        )}

        {phase.kind === 'blocked' && (
          <div className={styles.overlay}>
            <p className={styles.overlayTitle}>{phase.title}</p>
            <p className={styles.overlayBody}>{phase.body}</p>
          </div>
        )}

        {rollEmpty && phase.kind === 'live' && (
          <div className={styles.overlay}>
            <p className={styles.overlayTitle}>Roll filmmu habis</p>
            <p className={styles.overlayBody}>
              Semua {shotsLimit} jepretan sudah terpakai.
            </p>
            <Link href={`/a/${slug}/galeri`} className="btn btn-accent">
              <Images size={16} />
              Lihat galeri
            </Link>
          </div>
        )}
      </div>

      <header className={styles.bar}>
        <Link href={`/a/${slug}`} className={styles.iconBtn} aria-label="Kembali">
          <ArrowLeft size={18} />
        </Link>

        {/*
          Nama tamu merangkap jalan masuk ke pembetulan nama. Halaman perkenalan
          sudah tidak dilewati lagi setelah terdaftar, jadi tautannya harus ada
          di sini — dan menempelkannya pada nama itu sendiri jauh lebih mudah
          ditebak daripada menu tersendiri.
        */}
        <Link href={`/a/${slug}?ganti=1`} className={styles.barTitle}>
          <span className={styles.eventName}>{title}</span>
          <span className={styles.guestName}>{guestName}</span>
        </Link>

        <span className={styles.counter} aria-label={`${remaining} jepretan tersisa`}>
          <strong>{remaining}</strong>
          <span className={styles.counterMax}>/{shotsLimit}</span>
        </span>
      </header>

      {notice && (
        <p
          className={`${styles.toast} ${notice.kind === 'error' ? styles.toastError : ''}`}
          role="status"
        >
          {notice.text}
        </p>
      )}

      <div className={styles.dock}>
        {/* Nama saja. Deskripsi karakter tiap roll ada tempatnya di landing page,
            bukan di atas jempol orang yang sedang membidik. */}
        {/* Bingkai tidak ikut tersimpan ke berkas — yang dicatat cuma pilihannya,
            lalu ditempelkan saat foto diunduh. */}
        <div className={styles.rolls} role="group" aria-label="Pilih bingkai">
          {PHOTO_FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFrame(f.id)}
              aria-pressed={f.id === frame}
              disabled={busy}
              title={f.hint}
              className={`${styles.roll} ${f.id === frame ? styles.rollActive : ''}`}
            >
              {f.name}
            </button>
          ))}
        </div>

        <div className={styles.rolls} role="group" aria-label="Pilih roll film">
          {FILM_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => changePreset(p)}
              aria-pressed={p.id === preset.id}
              disabled={busy}
              className={`${styles.roll} ${p.id === preset.id ? styles.rollActive : ''}`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className={styles.controls}>
          <Link
            href={`/a/${slug}/galeri`}
            className={styles.thumbSlot}
            aria-label="Buka galeri"
          >
            {lastShot ? (
              // Blob URL sementara di memori — next/image tidak bisa
              // mengoptimasi apa pun di sini dan hanya menambah lapisan.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lastShot} alt="" className={styles.thumb} />
            ) : (
              <Images size={18} />
            )}
          </Link>

          <button
            type="button"
            onClick={capture}
            disabled={controlsLocked || rollEmpty}
            className={styles.shutter}
            aria-label="Jepret"
          >
            {busy ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <span className={styles.shutterDot} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
            disabled={controlsLocked}
            className={styles.iconBtn}
            aria-label="Balik kamera"
          >
            <SwitchCamera size={20} />
          </button>
        </div>
      </div>
    </main>
  )
}
