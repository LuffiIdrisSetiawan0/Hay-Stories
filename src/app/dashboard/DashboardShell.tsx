'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Aperture, LayoutDashboard, Loader2, LogOut, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './Dashboard.module.css'

export default function DashboardShell({
  children,
  email,
}: {
  children: React.ReactNode
  email: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logo} aria-label="HAY Stories — beranda">
            <span className={styles.logoMark} aria-hidden="true">
              <Aperture size={18} strokeWidth={1.8} />
            </span>
            <span>
              <span className={styles.logoText}>HAY Stories</span>
              <span className={styles.logoCaption}>Studio host</span>
            </span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Navigasi dashboard">
          <span className={styles.navLabel}>Workspace</span>
          <Link
            href="/dashboard"
            className={`${styles.navItem} ${pathname === '/dashboard' ? styles.navItemActive : ''}`}
            aria-current={pathname === '/dashboard' ? 'page' : undefined}
          >
            <LayoutDashboard size={18} />
            <span>Ringkasan</span>
          </Link>
          <Link
            href="/dashboard/new"
            className={`${styles.navItem} ${pathname === '/dashboard/new' ? styles.navItemActive : ''}`}
            aria-current={pathname === '/dashboard/new' ? 'page' : undefined}
          >
            <Plus size={18} />
            <span>Buat album</span>
          </Link>
        </nav>

        <div className={styles.sidebarNote}>
          <span className={styles.sidebarNoteEyebrow}>Alur acara</span>
          <strong>Buat, bagikan QR, lalu biarkan tamu bercerita.</strong>
          <p>Foto resolusi penuh diproses dan disimpan otomatis.</p>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{email.charAt(0).toUpperCase()}</div>
            <div className={styles.userDetails}>
              <span className={styles.userEmail}>{email}</span>
              <span className={styles.userRole}>Host</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className={styles.signOutBtn}
          >
            {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            {signingOut ? 'Keluar…' : 'Keluar'}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.mobileHeader}>
          <Link href="/dashboard" className={styles.logo} aria-label="Dashboard HAY Stories">
            <span className={styles.logoMark} aria-hidden="true">
              <Aperture size={17} />
            </span>
            <span className={styles.logoText}>HAY Stories</span>
          </Link>
          <div className={styles.mobileActions}>
            <Link href="/dashboard/new" className={styles.mobileActionBtn} aria-label="Buat album">
              <Plus size={19} />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className={styles.mobileActionBtn}
              aria-label="Keluar"
            >
              {signingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            </button>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  )
}
