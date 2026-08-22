import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import midtransClient from 'midtrans-client'
import { HAS_LEGAL_OPERATOR_IDENTITY, SUPPORT_EMAIL } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'

export type PaymentStatus =
  | 'pending'
  | 'challenge'
  | 'paid'
  | 'failed'
  | 'denied'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partial_refund'
  | 'chargeback'

export interface MidtransPayload extends Record<string, unknown> {
  order_id?: unknown
  transaction_id?: unknown
  transaction_status?: unknown
  status_code?: unknown
  gross_amount?: unknown
  fraud_status?: unknown
  payment_type?: unknown
  currency?: unknown
  signature_key?: unknown
}

export interface ApplyPaymentResult {
  outcome: string
  payment_id: string | null
  event_id: string | null
  payment_status: PaymentStatus | null
  event_activated: boolean
}

interface MidtransConfig {
  isProduction: boolean
  serverKey: string
  appOrigin: string
}

export class PaymentConfigurationError extends Error {
  constructor(
    message: string,
    public readonly issue: 'general' | 'support' | 'operator' = 'general'
  ) {
    super(message)
    this.name = 'PaymentConfigurationError'
  }
}

function requiredServerKey(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim()
  if (!serverKey || serverKey === 'your_midtrans_server_key') {
    throw new PaymentConfigurationError('MIDTRANS_SERVER_KEY belum dikonfigurasi.')
  }
  return serverKey
}

/**
 * Produksi hanya aktif melalui nilai eksplisit `true`. Nilai yang salah eja
 * ditolak, bukan ditebak dari NODE_ENV, agar deployment production tidak
 * pernah tanpa sengaja mengirim transaksi riil saat konfigurasi belum ditinjau.
 */
export function midtransIsProduction(): boolean {
  const raw = (process.env.MIDTRANS_IS_PRODUCTION ?? 'false').trim().toLowerCase()
  if (raw !== 'true' && raw !== 'false') {
    throw new PaymentConfigurationError('MIDTRANS_IS_PRODUCTION harus true atau false.')
  }
  return raw === 'true'
}

export function paidCheckoutDisclosureIssue(): 'support' | 'operator' | null {
  if (!SUPPORT_EMAIL) return 'support'
  if (midtransIsProduction() && !HAS_LEGAL_OPERATOR_IDENTITY) return 'operator'
  return null
}

/**
 * Checkout berbayar tidak boleh dibuka tanpa kanal bantuan yang valid. Pada
 * production, identitas operator juga wajib lengkap sebelum transaksi dibuat.
 */
export function requirePaidCheckoutDisclosure(): void {
  const issue = paidCheckoutDisclosureIssue()
  if (issue === 'support') {
    throw new PaymentConfigurationError(
      'NEXT_PUBLIC_SUPPORT_EMAIL belum valid untuk checkout berbayar.',
      'support'
    )
  }
  if (issue === 'operator') {
    throw new PaymentConfigurationError(
      'Identitas operator belum lengkap untuk checkout production.',
      'operator'
    )
  }
}

function configuredAppOrigin(isProduction: boolean): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!raw) throw new PaymentConfigurationError('NEXT_PUBLIC_APP_URL belum dikonfigurasi.')

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new PaymentConfigurationError('NEXT_PUBLIC_APP_URL bukan URL absolut yang valid.')
  }

  if (url.username || url.password || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    throw new PaymentConfigurationError('NEXT_PUBLIC_APP_URL memakai format yang tidak aman.')
  }
  if (isProduction && url.protocol !== 'https:') {
    throw new PaymentConfigurationError('Checkout production mewajibkan NEXT_PUBLIC_APP_URL HTTPS.')
  }
  if (!isProduction && url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new PaymentConfigurationError('URL callback HTTP hanya diizinkan untuk localhost sandbox.')
  }

  return url.origin
}

function getMidtransConfig(): MidtransConfig {
  const isProduction = midtransIsProduction()
  const serverKey = requiredServerKey()

  if (isProduction && serverKey.startsWith('SB-')) {
    throw new PaymentConfigurationError(
      'MIDTRANS_IS_PRODUCTION=true tidak cocok dengan Server Key sandbox.'
    )
  }

  return {
    isProduction,
    serverKey,
    appOrigin: configuredAppOrigin(isProduction),
  }
}

function getSnapClient(config = getMidtransConfig()) {
  return new midtransClient.Snap({
    isProduction: config.isProduction,
    serverKey: config.serverKey,
    // Snap Redirect tidak mengekspos snap.js di browser. Client key hanya
    // diteruskan bila sudah ada agar konfigurasi lama tetap kompatibel.
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() ?? '',
  })
}

function textField(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const valueTrimmed = value.trim()
  if (!valueTrimmed || valueTrimmed.length > maxLength) return null
  return valueTrimmed
}

export function parseGrossAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null
  }
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)(?:\.0{1,2})?$/.test(value)) {
    return null
  }
  const integerPart = value.split('.')[0]
  const amount = Number(integerPart)
  return Number.isSafeInteger(amount) ? amount : null
}

function normalizePaymentStatus(payload: MidtransPayload): PaymentStatus {
  const providerStatus = textField(payload.transaction_status, 40)?.toLowerCase() ?? ''
  const statusCode = textField(payload.status_code, 12) ?? ''
  const fraudStatus = textField(payload.fraud_status, 24)?.toLowerCase() ?? null

  if (
    providerStatus === 'settlement' &&
    statusCode === '200' &&
    (fraudStatus === null || fraudStatus === 'accept')
  ) {
    return 'paid'
  }
  if (providerStatus === 'capture' && statusCode === '200' && fraudStatus === 'accept') {
    return 'paid'
  }
  if (providerStatus === 'capture' && fraudStatus === 'challenge') return 'challenge'
  if (providerStatus === 'pending') return 'pending'
  if (providerStatus === 'deny') return 'denied'
  if (providerStatus === 'cancel') return 'cancelled'
  if (providerStatus === 'expire') return 'expired'
  if (providerStatus === 'refund') return 'refunded'
  if (providerStatus === 'partial_refund') return 'partial_refund'
  if (providerStatus === 'chargeback') return 'chargeback'
  return 'failed'
}

/** Verifikasi SHA-512 resmi: order_id + status_code + gross_amount + ServerKey. */
export function verifyMidtransSignature(payload: MidtransPayload): boolean {
  const orderId = typeof payload.order_id === 'string' ? payload.order_id : null
  const statusCode = typeof payload.status_code === 'string' ? payload.status_code : null
  const grossAmount = typeof payload.gross_amount === 'string' ? payload.gross_amount : null
  const signature = typeof payload.signature_key === 'string' ? payload.signature_key : null

  if (
    !orderId ||
    !statusCode ||
    !grossAmount ||
    !signature ||
    !/^[a-fA-F0-9]{128}$/.test(signature)
  ) {
    return false
  }

  const expected = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${requiredServerKey()}`, 'utf8')
    .digest()
  const received = Buffer.from(signature, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function validateSnapRedirectUrl(value: string): string {
  const config = getMidtransConfig()
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Midtrans mengembalikan URL checkout yang tidak valid.')
  }

  const expectedHost = config.isProduction ? 'app.midtrans.com' : 'app.sandbox.midtrans.com'
  if (
    url.protocol !== 'https:' ||
    url.hostname !== expectedHost ||
    url.port ||
    url.username ||
    url.password ||
    !url.pathname.startsWith('/snap/')
  ) {
    throw new Error('Host URL checkout Midtrans tidak sesuai environment.')
  }
  return url.toString()
}

export async function createSnapRedirect(input: {
  orderId: string
  amount: number
  tierName: string
  tierId: string
  eventId: string
  customerEmail?: string
}): Promise<string> {
  // Pertahanan terakhir bila fungsi ini kelak dipanggil dari alur server lain.
  // Pemeriksaan ini terjadi sebelum request apa pun dikirim ke Midtrans.
  requirePaidCheckoutDisclosure()
  const config = getMidtransConfig()
  const finishUrl = `${config.appOrigin}/dashboard/checkout/${input.eventId}`
  const itemName = `Paket ${input.tierName} HAY Stories`.slice(0, 50)

  const parameter: Record<string, unknown> = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: input.amount,
    },
    item_details: [
      {
        id: input.tierId,
        price: input.amount,
        quantity: 1,
        name: itemName,
        category: 'Digital event album',
      },
    ],
    credit_card: { secure: true },
    callbacks: { finish: finishUrl, error: finishUrl },
    expiry: { duration: 24, unit: 'hours' },
  }

  if (input.customerEmail) {
    parameter.customer_details = {
      email: input.customerEmail.slice(0, 255),
    }
  }

  const redirectUrl = await getSnapClient(config).createTransactionRedirectUrl(parameter)
  if (typeof redirectUrl !== 'string') {
    throw new Error('Midtrans tidak mengembalikan URL checkout.')
  }
  return validateSnapRedirectUrl(redirectUrl)
}

export async function getMidtransTransactionStatus(orderId: string): Promise<MidtransPayload> {
  if (!/^[A-Za-z0-9_-]{8,50}$/.test(orderId)) {
    throw new Error('Order ID tidak valid.')
  }
  return (await getSnapClient().transaction.status(orderId)) as MidtransPayload
}

/**
 * Terapkan payload yang sudah dipercaya (signature webhook valid atau hasil
 * GET Status API). Nilai tier/limit tidak pernah diambil dari payload; RPC
 * memakai snapshot payment yang sudah disimpan sebelum transaksi dibuat.
 */
export async function applyTrustedMidtransStatus(
  payload: MidtransPayload
): Promise<ApplyPaymentResult> {
  const orderId = textField(payload.order_id, 50)
  const transactionId = textField(payload.transaction_id, 128)
  const providerStatus = textField(payload.transaction_status, 40) ?? ''
  const paymentType = textField(payload.payment_type, 64)
  const statusCode = textField(payload.status_code, 12) ?? ''
  const fraudStatus = textField(payload.fraud_status, 24)
  const currency = textField(payload.currency, 8)?.toUpperCase() ?? 'IDR'
  const grossAmount = parseGrossAmount(payload.gross_amount)

  if (!orderId || !providerStatus || grossAmount === null || currency !== 'IDR') {
    return {
      outcome: 'invalid_payload',
      payment_id: null,
      event_id: null,
      payment_status: null,
      event_activated: false,
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .rpc('apply_midtrans_payment_update', {
      p_order_id: orderId,
      p_transaction_id: transactionId,
      p_normalized_status: normalizePaymentStatus(payload),
      p_midtrans_status: providerStatus.toLowerCase(),
      p_payment_type: paymentType,
      p_status_code: statusCode,
      p_fraud_status: fraudStatus?.toLowerCase() ?? null,
      p_gross_amount: grossAmount,
    })
    .single<ApplyPaymentResult>()

  if (error || !data) {
    throw new Error('Status pembayaran tidak dapat disimpan.')
  }
  return data
}
