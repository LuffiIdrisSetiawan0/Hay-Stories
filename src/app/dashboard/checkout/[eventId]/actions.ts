'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTier } from '@/lib/catalog'
import { resolveLimits } from '@/lib/events'
import {
  PaymentConfigurationError,
  applyTrustedMidtransStatus,
  createSnapRedirect,
  getMidtransTransactionStatus,
  requirePaidCheckoutDisclosure,
  validateSnapRedirectUrl,
} from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface OwnedEvent {
  id: string
  host_id: string
  tier: string
  status: string
}

interface EnsuredPayment {
  outcome: string
  created: boolean
  payment_id: string | null
  order_id: string | null
  payment_status: string | null
  payment_amount: number | null
  payment_tier: string | null
  redirect_url: string | null
  snapshot_max_guests: number | null
  snapshot_shots_per_guest: number | null
  snapshot_retention_days: number | null
}

const RETRYABLE_STATUSES = new Set(['failed', 'denied', 'cancelled', 'expired'])

function localCheckoutUrl(eventId: string, problem?: string, sync?: string) {
  const params = new URLSearchParams()
  if (problem) params.set('masalah', problem)
  if (sync) params.set('sinkron', sync)
  const query = params.toString()
  return `/dashboard/checkout/${eventId}${query ? `?${query}` : ''}`
}

async function getOwnedEvent(eventId: string): Promise<{
  user: { id: string; email?: string }
  event: OwnedEvent
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: event } = await supabase
    .from('events')
    .select('id, host_id, tier, status')
    .eq('id', eventId)
    .eq('host_id', user.id)
    .maybeSingle<OwnedEvent>()

  return event ? { user: { id: user.id, email: user.email }, event } : null
}

function newOrderId(eventId: string) {
  return `HAY-${eventId.slice(0, 8)}-${randomUUID().replaceAll('-', '').slice(0, 16)}`
}

/** Ambil/buat order pending, buat Snap Redirect, lalu pindahkan ke Midtrans. */
export async function startCheckout(eventId: string): Promise<never> {
  const owned = await getOwnedEvent(eventId)
  if (!owned) redirect('/login')

  if (owned.event.status === 'active') {
    redirect(`/dashboard/events/${owned.event.id}`)
  }

  const tier = getTier(owned.event.tier)
  if (
    owned.event.status !== 'draft' ||
    !tier ||
    !tier.available ||
    tier.id === 'starter' ||
    tier.price <= 0
  ) {
    redirect(localCheckoutUrl(eventId, 'album'))
  }

  // Gagal tertutup sebelum membuat row payment atau menghubungi provider.
  // Support wajib di semua environment; identitas operator wajib di production.
  try {
    requirePaidCheckoutDisclosure()
  } catch (configurationError) {
    const issue =
      configurationError instanceof PaymentConfigurationError
        ? configurationError.issue
        : 'general'
    redirect(
      localCheckoutUrl(
        eventId,
        issue === 'support' ? 'support' : issue === 'operator' ? 'operator' : 'config'
      )
    )
  }

  const limits = resolveLimits(tier.id)
  const admin = createAdminClient()
  let targetUrl = localCheckoutUrl(eventId, 'provider')

  // Sebelum membuat order pengganti, konfirmasi ulang order terminal ke
  // provider. Ini menutup jendela ketika webhook settlement sedang terlambat:
  // pengguna tidak ditagih dua kali hanya karena tampilan lokal masih gagal.
  const { data: latestPayment } = await admin
    .from('payments')
    .select('midtrans_order_id, status')
    .eq('event_id', eventId)
    .eq('user_id', owned.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ midtrans_order_id: string; status: string }>()

  if (latestPayment && RETRYABLE_STATUSES.has(latestPayment.status)) {
    let preflightTarget: string | null = null
    try {
      const providerStatus = await getMidtransTransactionStatus(latestPayment.midtrans_order_id)
      if (providerStatus.order_id !== latestPayment.midtrans_order_id) {
        preflightTarget = localCheckoutUrl(eventId, 'provider')
      } else {
        const refreshed = await applyTrustedMidtransStatus(providerStatus)
        if (refreshed.event_activated || refreshed.outcome === 'already_active') {
          preflightTarget = `/dashboard/events/${eventId}`
        } else if (
          !refreshed.payment_status ||
          !RETRYABLE_STATUSES.has(refreshed.payment_status)
        ) {
          preflightTarget = localCheckoutUrl(
            eventId,
            undefined,
            refreshed.payment_status ?? 'pending'
          )
        }
      }
    } catch (statusError) {
      preflightTarget = localCheckoutUrl(
        eventId,
        statusError instanceof PaymentConfigurationError ? 'config' : 'provider'
      )
    }
    if (preflightTarget) redirect(preflightTarget)
  }

  const { data, error } = await admin
    .rpc('ensure_pending_event_payment', {
      p_event_id: eventId,
      p_user_id: owned.user.id,
      p_order_id: newOrderId(eventId),
      p_tier: tier.id,
      p_amount: tier.price,
      p_max_guests: limits.maxGuests,
      p_shots_per_guest: limits.shotsPerGuest,
      p_retention_days: tier.retentionDays,
    })
    .single<EnsuredPayment>()

  if (error || !data) redirect(localCheckoutUrl(eventId, 'database'))
  if (data.outcome === 'already_active') redirect(`/dashboard/events/${eventId}`)
  if (data.outcome === 'already_paid') redirect(localCheckoutUrl(eventId, 'aktivasi'))
  if (
    !['created', 'existing'].includes(data.outcome) ||
    !data.payment_id ||
    !data.order_id ||
    !data.payment_tier ||
    !data.payment_amount ||
    data.payment_tier !== tier.id ||
    !data.snapshot_max_guests ||
    !data.snapshot_shots_per_guest
  ) {
    redirect(localCheckoutUrl(eventId, 'album'))
  }

  // Row yang sudah memiliki URL adalah retry idempoten: jangan membuat order
  // baru dan jangan menyentuh Midtrans lagi.
  if (data.redirect_url) {
    try {
      targetUrl = validateSnapRedirectUrl(data.redirect_url)
    } catch {
      targetUrl = localCheckoutUrl(eventId, 'provider')
    }
    redirect(targetUrl)
  }

  const quotedTier = getTier(data.payment_tier)
  if (!quotedTier || quotedTier.id === 'starter') {
    redirect(localCheckoutUrl(eventId, 'database'))
  }

  try {
    targetUrl = await createSnapRedirect({
      orderId: data.order_id,
      amount: data.payment_amount,
      tierName: quotedTier.name,
      tierId: quotedTier.id,
      eventId,
      customerEmail: owned.user.email,
    })

    // Jika penyimpanan URL gagal setelah Midtrans membuat order, host tetap
    // diarahkan memakai respons yang sudah divalidasi. Webhook/status sync
    // masih dapat mencocokkan order lewat row payment yang dibuat lebih dulu.
    await admin
      .from('payments')
      .update({ snap_redirect_url: targetUrl })
      .eq('id', data.payment_id)
      .eq('event_id', eventId)
      .eq('user_id', owned.user.id)
      .eq('status', 'pending')
  } catch (checkoutError) {
    targetUrl = localCheckoutUrl(
      eventId,
      checkoutError instanceof PaymentConfigurationError ? 'config' : 'provider'
    )

    // Request paralel mungkin kalah karena Midtrans menolak order_id duplikat
    // sementara request pertama sudah menyimpan URL. Baca ulang sekali tanpa
    // menampilkan detail error provider yang dapat mengandung credential.
    const { data: current } = await admin
      .from('payments')
      .select('snap_redirect_url')
      .eq('id', data.payment_id)
      .maybeSingle<{ snap_redirect_url: string | null }>()
    if (current?.snap_redirect_url) {
      try {
        targetUrl = validateSnapRedirectUrl(current.snap_redirect_url)
      } catch {
        // Gunakan pesan provider generik yang sudah dipilih di atas.
      }
    }
  }

  redirect(targetUrl)
}

/** Cek status langsung ke Midtrans; tidak pernah memakai query string browser. */
export async function syncPaymentStatus(eventId: string): Promise<never> {
  const owned = await getOwnedEvent(eventId)
  if (!owned) redirect('/login')
  if (owned.event.status === 'active') redirect(`/dashboard/events/${eventId}`)

  const supabase = await createClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('midtrans_order_id, last_synced_at')
    .eq('event_id', eventId)
    .eq('user_id', owned.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ midtrans_order_id: string; last_synced_at: string | null }>()

  if (!payment) redirect(localCheckoutUrl(eventId, 'belum_ada_order'))

  // Hindari tombol ganda menghabiskan rate limit provider. Ini bukan sumber
  // kebenaran keamanan; webhook tetap dapat memproses kapan pun.
  const lastSync = payment.last_synced_at ? new Date(payment.last_synced_at).getTime() : 0
  if (Number.isFinite(lastSync) && Date.now() - lastSync < 5_000) {
    redirect(localCheckoutUrl(eventId, undefined, 'baru'))
  }

  let target = localCheckoutUrl(eventId, 'provider')
  try {
    const providerStatus = await getMidtransTransactionStatus(payment.midtrans_order_id)
    if (providerStatus.order_id === payment.midtrans_order_id) {
      const result = await applyTrustedMidtransStatus(providerStatus)
      revalidatePath(`/dashboard/checkout/${eventId}`)
      revalidatePath('/dashboard')
      revalidatePath(`/dashboard/events/${eventId}`)

      target = result.event_activated || result.outcome === 'already_active'
        ? `/dashboard/events/${eventId}`
        : localCheckoutUrl(eventId, undefined, result.payment_status ?? result.outcome)
    }
  } catch (statusError) {
    target = localCheckoutUrl(
      eventId,
      statusError instanceof PaymentConfigurationError ? 'config' : 'provider'
    )
  }

  redirect(target)
}
