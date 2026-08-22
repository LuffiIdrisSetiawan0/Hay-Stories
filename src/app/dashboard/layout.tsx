import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from './DashboardShell'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s • Dashboard HAY Stories',
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
  },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <DashboardShell email={user.email ?? 'Host HAY Stories'}>{children}</DashboardShell>
}
