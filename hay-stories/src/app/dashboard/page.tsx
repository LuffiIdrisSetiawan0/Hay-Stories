"use client";

import Link from "next/link";
import { Plus, Image as ImageIcon, Users, Clock, ArrowRight } from "lucide-react";
import styles from "./Dashboard.module.css";

// Mock data for initial UI build
const mockEvents = [
  {
    id: "1",
    title: "Pernikahan Andi & Lina",
    date: "2026-09-15T00:00:00Z",
    status: "active",
    photoCount: 142,
    guestCount: 68,
    preset: "Portra 400",
  },
  {
    id: "2",
    title: "Ulang Tahun ke-25 Sarah",
    date: "2026-08-20T00:00:00Z",
    status: "revealed",
    photoCount: 89,
    guestCount: 24,
    preset: "FunSaver",
  },
];

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function DashboardPage() {
  return (
    <div className={styles.dashboardHome}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Kelola album dan lihat kenangan acaramu.</p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary">
          <Plus size={18} />
          Buat Album
        </Link>
      </div>

      {mockEvents.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📷</div>
          <h2 className={styles.emptyTitle}>Belum ada album</h2>
          <p className={styles.emptyDesc}>
            Buat album pertamamu untuk mulai mengumpulkan foto dari tamu-tamumu.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary">
            Buat Album Sekarang
          </Link>
        </div>
      ) : (
        <div className={styles.eventGrid}>
          {mockEvents.map((event) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`} className={styles.eventCard}>
              <div className={styles.eventCardHeader}>
                <div>
                  <h3 className={styles.eventTitle}>{event.title}</h3>
                  <p className={styles.eventDate}>{formatDate(event.date)}</p>
                </div>
                <span
                  className={`${styles.statusBadge} ${
                    event.status === "active" ? styles.statusActive : styles.statusRevealed
                  }`}
                >
                  {event.status === "active" ? "Aktif" : "Terungkap"}
                </span>
              </div>

              <div className={styles.eventStats}>
                <div className={styles.statItem}>
                  <ImageIcon size={14} className={styles.statIcon} />
                  <span>{event.photoCount} foto</span>
                </div>
                <div className={styles.statItem}>
                  <Users size={14} className={styles.statIcon} />
                  <span>{event.guestCount} tamu</span>
                </div>
                <div className={styles.statItem}>
                  <Clock size={14} className={styles.statIcon} />
                  <span>{event.preset}</span>
                </div>
              </div>

              <div className={styles.eventCardFooter}>
                <span>Kelola album</span>
                <ArrowRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
