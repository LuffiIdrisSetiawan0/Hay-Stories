"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { LayoutDashboard, Plus, LogOut, Loader2 } from "lucide-react";
import styles from "./Dashboard.module.css";
import { User } from "@supabase/supabase-js";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>✦</span>
            <span className={styles.logoText}>HAY Stories</span>
          </Link>
        </div>

        <nav className={styles.nav}>
          <Link
            href="/dashboard"
            className={`${styles.navItem} ${pathname === "/dashboard" ? styles.navItemActive : ""}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/dashboard/new"
            className={`${styles.navItem} ${pathname === "/dashboard/new" ? styles.navItemActive : ""}`}
          >
            <Plus size={18} />
            <span>Buat Album Baru</span>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userEmail}>{user?.email}</span>
              <span className={styles.userRole}>Host</span>
            </div>
          </div>
          <button onClick={handleSignOut} className={styles.signOutBtn}>
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Mobile Header */}
        <header className={styles.mobileHeader}>
          <Link href="/dashboard" className={styles.logo}>
            <span className={styles.logoIcon}>✦</span>
            <span className={styles.logoText}>HAY Stories</span>
          </Link>
          <div className={styles.mobileActions}>
            <Link href="/dashboard/new" className={styles.mobileActionBtn}>
              <Plus size={20} />
            </Link>
            <button onClick={handleSignOut} className={styles.mobileActionBtn}>
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
