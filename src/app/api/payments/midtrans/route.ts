import { NextResponse } from 'next/server'
import {
  PaymentConfigurationError,
  applyTrustedMidtransStatus,
  getMidtransTransactionStatus,
  verifyMidtransSignature,
  type MidtransPayload,
} from '@/lib/payments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 64 * 1024

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.startsWith('application/json')) {
    return json({ received: false, error: 'content_type' }, 415)
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ received: false, error: 'payload_too_large' }, 413)
  }

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return json({ received: false, error: 'payload_too_large' }, 413)
  }

  let payload: MidtransPayload
  try {
    const parsed: unknown = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ received: false, error: 'invalid_json' }, 400)
    }
    payload = parsed as MidtransPayload
  } catch {
    return json({ received: false, error: 'invalid_json' }, 400)
  }

  try {
    if (!verifyMidtransSignature(payload)) {
      return json({ received: false, error: 'invalid_signature' }, 401)
    }

    const webhookOrderId = typeof payload.order_id === 'string' ? payload.order_id : ''
    const providerStatus = await getMidtransTransactionStatus(webhookOrderId)
    if (providerStatus.order_id !== webhookOrderId) {
      return json({ received: false, error: 'status_mismatch' }, 503)
    }

    // Signature membuktikan asal notifikasi; GET Status memastikan seluruh
    // field yang tidak tercakup hash (mis. transaction_status/fraud_status)
    // juga berasal langsung dari Midtrans.
    const result = await applyTrustedMidtransStatus(providerStatus)
    // Outcome mismatch tetap diakui sebagai 2xx supaya notifikasi yang valid
    // tetapi tidak cocok dengan order lokal tidak diputar ulang selamanya.
    return json({ received: true, applied: result.outcome })
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      return json({ received: false, error: 'payment_not_configured' }, 503)
    }
    // 503 meminta Midtrans mengulang ketika database/provider sementara gagal.
    // Objek error sengaja tidak dicetak: client library dapat menyertakan
    // header Authorization yang mengandung Server Key.
    return json({ received: false, error: 'temporary_failure' }, 503)
  }
}
