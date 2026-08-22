'use client'

import { useFormStatus } from 'react-dom'
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react'

export default function CheckoutSubmit({
  label,
  pendingLabel,
  variant = 'primary',
  icon = 'arrow',
}: {
  label: string
  pendingLabel: string
  variant?: 'primary' | 'secondary'
  icon?: 'arrow' | 'refresh'
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className={`btn btn-${variant}`} disabled={pending}>
      {pending ? (
        <Loader2 size={15} className="animate-spin" />
      ) : icon === 'refresh' ? (
        <RefreshCw size={15} />
      ) : null}
      {pending ? pendingLabel : label}
      {!pending && icon === 'arrow' && <ArrowRight size={16} />}
    </button>
  )
}
