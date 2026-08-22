import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { formatGuestLimit, formatPrice, getTier } from '@/lib/catalog'
import { paidCheckoutDisclosureIssue } from '@/lib/payments'
import { createClient } from '@/lib/supabase/server'
import { startCheckout, syncPaymentStatus } from './actions'
import CheckoutSubmit from './CheckoutSubmit'
import styles from './Checkout.module.css'

export const metadata: Metadata = {
  title: 'Pembayaran Album — HAY Stories',
}

interface PaymentRow {
  id: string
  midtrans_order_id: string
  amount: number
  tier: string
  status: string
  payment_type: string | null
  paid_at: string | null
  created_at: string
  updated_at: string | null
  last_synced_at: string | null
  snap_redirect_url: string | null
  limit_max_guests: number | null
  limit_shots_per_guest: number | null
  limit_retention_days: number | null
}

const TERMINAL_RETRY = new Set(['failed', 'denied', 'cancelled', 'expired'])

const STATUS_COPY: Record<string, { label: string; description: string; tone: string }> = {
  pending: {
    label: 'Menunggu pembayaran',
    description: 'Selesaikan pembayaran di halaman Midtrans. Album tetap draf sampai dana terkonfirmasi.',
    tone: 'pending',
  },
  challenge: {
    label: 'Sedang ditinjau',
    description: 'Pembayaran kartu sedang diperiksa. Jangan membuat transaksi baru sampai status berubah.',
    tone: 'pending',
  },
  paid: {
    label: 'Pembayaran diterima',
    description: 'Pembayaran sah sudah tercatat. Album sedang memastikan aktivasi paket.',
    tone: 'success',
  },
  failed: {
    label: 'Pembayaran gagal',
    description: 'Transaksi ini tidak berhasil. Kamu dapat mencoba order baru tanpa membuat album ulang.',
    tone: 'error',
  },
  denied: {
    label: 'Pembayaran ditolak',
    description: 'Metode pembayaran menolak transaksi. Coba lagi dengan metode lain.',
    tone: 'error',
  },
  cancelled: {
    label: 'Pembayaran dibatalkan',
    description: 'Order ini sudah dibatalkan. Kamu dapat memulai pembayaran baru.',
    tone: 'muted',
  },
  expired: {
    label: 'Order kedaluwarsa',
    description: 'Batas waktu order sudah habis. Mulai order baru untuk melanjutkan.',
    tone: 'muted',
  },
  refunded: {
    label: 'Dana dikembalikan',
    description: 'Refund tercatat. Hubungi pengelola bila kamu memerlukan bantuan akses album.',
    tone: 'muted',
  },
  partial_refund: {
    label: 'Refund sebagian',
    description: 'Sebagian dana telah dikembalikan. Status akses perlu direkonsiliasi oleh pengelola.',
    tone: 'muted',
  },
  chargeback: {
    label: 'Chargeback tercatat',
    description: 'Sengketa pembayaran tercatat. Hubungi pengelola untuk tindak lanjut.',
    tone: 'error',
  },
}

const PROBLEM_COPY: Record<string, string> = {
  config: 'Checkout belum dikonfigurasi dengan benar. Pengelola perlu memeriksa environment Midtrans.',
  support: 'Checkout berbayar dinonaktifkan sampai pengelola memasang email dukungan yang valid.',
  operator: 'Checkout production dinonaktifkan sampai identitas operator dilengkapi oleh pengelola.',
  provider: 'Midtrans belum dapat dihubungi. Tidak ada tagihan baru yang dibuat secara paksa; coba lagi sebentar lagi.',
  database: 'Data pembayaran belum dapat disiapkan. Pastikan migrasi database terbaru sudah dijalankan.',
  album: 'Album ini tidak dapat dibayar dengan paket yang dipilih.',
  belum_ada_order: 'Belum ada order Midtrans yang dapat diperiksa.',
  aktivasi: 'Pembayaran sudah diterima, tetapi aktivasi album perlu diperiksa pengelola. Kamu tidak akan ditagih ulang.',
}

function formatDateTime(value: string | null) {
  if (!value) return 'Belum pernah'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default async function CheckoutPage(props: PageProps<'/dashboard/checkout/[eventId]'>) {
  const { eventId } = await props.params
  const search = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, tier, status')
    .eq('id', eventId)
    .eq('host_id', user.id)
    .maybeSingle<{ id: string; title: string; tier: string; status: string }>()
  if (!event) notFound()

  const tier = getTier(event.tier)
  if (!tier || tier.id === 'starter') redirect(`/dashboard/events/${event.id}`)

  const { data: payment } = await supabase
    .from('payments')
    .select(
      'id, midtrans_order_id, amount, tier, status, payment_type, paid_at, created_at, updated_at, last_synced_at, snap_redirect_url, limit_max_guests, limit_shots_per_guest, limit_retention_days'
    )
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<PaymentRow>()

  const rawProblem = Array.isArray(search.masalah) ? search.masalah[0] : search.masalah
  const problem = rawProblem ? PROBLEM_COPY[rawProblem] : null
  const rawSync = Array.isArray(search.sinkron) ? search.sinkron[0] : search.sinkron
  const returnedFromProvider = Boolean(search.order_id || search.transaction_status || search.status_code)
  const isActive = event.status === 'active'
  const statusMeta = payment
    ? (STATUS_COPY[payment.status] ?? {
        label: 'Status belum dikenal',
        description: 'Periksa ulang status ke Midtrans atau hubungi pengelola.',
        tone: 'muted',
      })
    : null
  const canRetry = Boolean(payment && TERMINAL_RETRY.has(payment.status))
  const sandboxMode = (process.env.MIDTRANS_IS_PRODUCTION ?? 'false').toLowerCase() !== 'true'
  const quotedMaxGuests = payment?.limit_max_guests ?? tier.maxGuests
  const quotedShots = payment?.limit_shots_per_guest ?? tier.shotsPerGuest
  const quotedRetention = payment ? payment.limit_retention_days : tier.retentionDays
  let disclosureIssue: 'support' | 'operator' | 'config' | null = null
  try {
    disclosureIssue = paidCheckoutDisclosureIssue()
  } catch {
    disclosureIssue = 'config'
  }
  const checkoutReady = disclosureIssue === null

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.back}>
        <ArrowLeft size={15} />
        Kembali ke dashboard
      </Link>

      <header className={styles.header}>
        <p className={styles.eyebrow}>Checkout album</p>
        <h1>{isActive ? 'Pembayaran selesai.' : `Aktifkan ${event.title}`}</h1>
        <p>
          {isActive
            ? 'Paket sudah aktif. QR acara kini siap dibagikan kepada tamu.'
            : 'Pembayaran diproses di halaman aman Midtrans. HAY Stories tidak pernah menerima data kartu atau PIN-mu.'}
        </p>
      </header>

      {sandboxMode && (
        <div className={styles.sandbox} role="status">
          Mode sandbox aktif — transaksi di environment ini bukan pembayaran nyata.
        </div>
      )}

      {problem && (
        <div className={styles.problem} role="alert">
          <AlertCircle size={19} />
          <span>{problem}</span>
        </div>
      )}

      {!problem && disclosureIssue && (
        <div className={styles.problem} role="alert">
          <AlertCircle size={19} />
          <span>{PROBLEM_COPY[disclosureIssue]}</span>
        </div>
      )}

      {returnedFromProvider && !isActive && (
        <div className={styles.notice} role="status">
          <Clock3 size={19} />
          <span>
            Kamu sudah kembali dari Midtrans. Status pada alamat browser tidak dipakai sebagai bukti;
            tekan <strong>Periksa status</strong> untuk konfirmasi server-ke-server.
          </span>
        </div>
      )}

      {rawSync && !problem && !isActive && (
        <div className={styles.notice} role="status">
          <RefreshCw size={18} />
          <span>
            {rawSync === 'baru'
              ? 'Status baru saja diperiksa. Tunggu beberapa detik sebelum mengecek lagi.'
              : `Status terbaru: ${STATUS_COPY[rawSync]?.label ?? 'belum berubah'}.`}
          </span>
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.summaryCard} aria-labelledby="order-summary-title">
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.cardEyebrow}>Ringkasan</p>
              <h2 id="order-summary-title">Paket {tier.name}</h2>
            </div>
            <CreditCard size={22} />
          </div>

          <dl className={styles.details}>
            <div>
              <dt>Album</dt>
              <dd>{event.title}</dd>
            </div>
            <div>
              <dt>Kapasitas</dt>
              <dd>{formatGuestLimit(quotedMaxGuests)}</dd>
            </div>
            <div>
              <dt>Jepretan</dt>
              <dd>{quotedShots} per tamu</dd>
            </div>
            <div>
              <dt>Penyimpanan</dt>
              <dd>
                {quotedRetention === null
                  ? 'Tidak kedaluwarsa otomatis selama layanan dan akun aktif'
                  : `${quotedRetention} hari`}
              </dd>
            </div>
          </dl>

          <div className={styles.total}>
            <span>Total sekali bayar</span>
            <strong>{formatPrice(payment?.amount ?? tier.price)}</strong>
          </div>

          <div className={styles.securityNote}>
            <ShieldCheck size={18} />
            <span>Nominal dan paket diperiksa ulang sebelum album diaktifkan.</span>
          </div>
        </section>

        <section className={styles.statusCard} aria-labelledby="payment-status-title">
          {isActive ? (
            <>
              <div className={`${styles.statusIcon} ${styles.statusSuccess}`}>
                <CheckCircle2 size={28} />
              </div>
              <p className={styles.cardEyebrow}>Terkonfirmasi</p>
              <h2 id="payment-status-title">Album sudah aktif</h2>
              <p className={styles.statusDescription}>
                Limit paket telah disalin ke album dan tidak bergantung pada parameter dari browser.
              </p>
              <div className={styles.actions}>
                <Link href={`/dashboard/events/${event.id}`} className="btn btn-primary">
                  Kelola dan bagikan album
                  <ArrowRight size={16} />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className={styles.statusHeading}>
                <div>
                  <p className={styles.cardEyebrow}>Status pembayaran</p>
                  <h2 id="payment-status-title">{statusMeta?.label ?? 'Belum ada order'}</h2>
                </div>
                {statusMeta && (
                  <span className={styles.statusPill} data-tone={statusMeta.tone}>
                    {statusMeta.label}
                  </span>
                )}
              </div>

              <p className={styles.statusDescription}>
                {statusMeta?.description ??
                  'Buat order pembayaran untuk mendapatkan halaman checkout hosted Midtrans.'}
              </p>

              {payment && (
                <dl className={styles.paymentMeta}>
                  <div>
                    <dt>Order ID</dt>
                    <dd>{payment.midtrans_order_id}</dd>
                  </div>
                  <div>
                    <dt>Diperiksa terakhir</dt>
                    <dd>{formatDateTime(payment.last_synced_at)}</dd>
                  </div>
                </dl>
              )}

              <p className={styles.legalConsent}>
                Order belum dibayar boleh ditinggalkan; dengan melanjutkan, kamu menyetujui{' '}
                <Link href="/syarat">Syarat Penggunaan</Link> termasuk ketentuan pengajuan refund
                dan biaya kanal, serta telah membaca{' '}
                <Link href="/privasi">Kebijakan Privasi</Link>.
              </p>

              <div className={styles.actions}>
                {checkoutReady &&
                  (!payment || ['pending', 'challenge'].includes(payment.status) || canRetry) && (
                    <form action={startCheckout.bind(null, event.id)}>
                      <CheckoutSubmit
                        label={canRetry
                          ? 'Coba pembayaran baru'
                          : payment?.snap_redirect_url
                            ? 'Buka lagi halaman pembayaran'
                            : 'Lanjut ke Midtrans'}
                        pendingLabel="Menyiapkan checkout…"
                      />
                    </form>
                  )}

                {payment && payment.status !== 'paid' && (
                  <form action={syncPaymentStatus.bind(null, event.id)}>
                    <CheckoutSubmit
                      label="Periksa status"
                      pendingLabel="Memeriksa…"
                      variant="secondary"
                      icon="refresh"
                    />
                  </form>
                )}
              </div>

              {payment && (
                <p className={styles.help}>
                  Jangan membayar order lama setelah membuat order baru. Jika saldo sudah terpotong
                  tetapi status belum berubah, tunggu notifikasi beberapa saat lalu periksa lagi.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
