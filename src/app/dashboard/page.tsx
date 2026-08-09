import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Image as ImageIcon, Users, Clock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPreset } from "@/lib/catalog";
import { resolveReveal } from "@/lib/events";
import styles from "./Dashboard.module.css";

function formatDate(iso: string | null) {
  if (!iso) return "Tanggal belum diisi";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS membatasi ke acara milik host ini, jadi tidak perlu filter host_id
  // secara eksplisit — tapi tetap ditulis agar maksudnya terbaca jelas dan
  // query tetap benar seandainya policy berubah.
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, slug, event_date, preset, status, reveal_mode, reveal_at, is_revealed")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className={styles.dashboardHome}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
          </div>
        </div>
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>Tidak bisa memuat album</h2>
          <p className={styles.emptyDesc}>
            Database belum siap. Jalankan berkas di <code>supabase/migrations/</code> lewat SQL
            Editor di dashboard Supabase, lalu muat ulang halaman ini.
          </p>
        </div>
      </div>
    );
  }

  const eventIds = (events ?? []).map((e) => e.id);

  // Hitungan diambil sekali untuk semua album, bukan satu query per kartu.
  const [photoRows, guestRows] = eventIds.length
    ? await Promise.all([
        supabase.from("photos").select("event_id").in("event_id", eventIds).eq("status", "ready"),
        supabase.from("guests").select("event_id").in("event_id", eventIds),
      ])
    : [{ data: [] }, { data: [] }];

  const tally = (rows: { event_id: string }[] | null) =>
    (rows ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.event_id] = (acc[row.event_id] ?? 0) + 1;
      return acc;
    }, {});

  const photoCounts = tally(photoRows.data);
  const guestCounts = tally(guestRows.data);

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

      {!events || events.length === 0 ? (
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
          {events.map((event) => {
            const reveal = resolveReveal(event);
            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className={styles.eventCard}
              >
                <div className={styles.eventCardHeader}>
                  <div>
                    <h3 className={styles.eventTitle}>{event.title}</h3>
                    <p className={styles.eventDate}>{formatDate(event.event_date)}</p>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${
                      reveal.revealed ? styles.statusRevealed : styles.statusActive
                    }`}
                  >
                    {reveal.revealed ? "Terungkap" : "Aktif"}
                  </span>
                </div>

                <div className={styles.eventStats}>
                  <div className={styles.statItem}>
                    <ImageIcon size={14} className={styles.statIcon} />
                    <span>{photoCounts[event.id] ?? 0} foto</span>
                  </div>
                  <div className={styles.statItem}>
                    <Users size={14} className={styles.statIcon} />
                    <span>{guestCounts[event.id] ?? 0} tamu</span>
                  </div>
                  <div className={styles.statItem}>
                    <Clock size={14} className={styles.statIcon} />
                    <span>{getPreset(event.preset)?.name ?? event.preset}</span>
                  </div>
                </div>

                <div className={styles.eventCardFooter}>
                  <span>Kelola album</span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
