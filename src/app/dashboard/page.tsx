import Link from "next/link";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Images,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEventLifecycle } from "@/lib/events";
import styles from "./Dashboard.module.css";

interface EventCountRow {
  event_id: string;
  photo_count: unknown;
  guest_count: unknown;
}

interface EventCounts {
  photos: number | null;
  guests: number | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "Tanggal belum diisi";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

async function readRequestTime() {
  // Keep the timestamp in an explicit request-time IO boundary, then reuse the
  // same snapshot for every card rendered in this response.
  await io();
  return Date.now();
}

function safeCount(value: unknown): number | null {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
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
    .select(
      "id, title, slug, event_date, shots_per_guest, status, expires_at, reveal_mode, reveal_at, is_revealed"
    )
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

  /*
   * Satu RPC mengagregasi seluruh album di PostgreSQL. Ini menghindari batas
   * baris PostgREST sekaligus menghindari dua request tambahan per album.
   */
  const { data: countRows, error: countError } = await supabase.rpc("get_host_event_counts");
  if (countError) console.error("Gagal menghitung statistik dashboard:", countError);

  const rowsByEvent = new Map<string, EventCounts>(
    ((countRows ?? []) as EventCountRow[]).map((row) => [
      row.event_id as string,
      {
        photos: safeCount(row.photo_count),
        guests: safeCount(row.guest_count),
      },
    ])
  );
  const eventCounts = (events ?? []).map((event) => {
    const counts = countError ? null : rowsByEvent.get(event.id);
    return {
      eventId: event.id,
      photos: counts?.photos ?? null,
      guests: counts?.guests ?? null,
    };
  });

  const photoCounts = new Map(eventCounts.map((count) => [count.eventId, count.photos]));
  const guestCounts = new Map(eventCounts.map((count) => [count.eventId, count.guests]));
  const totalPhotos = eventCounts.every((count) => count.photos !== null)
    ? eventCounts.reduce((sum, count) => sum + (count.photos ?? 0), 0)
    : null;
  const totalGuests = eventCounts.every((count) => count.guests !== null)
    ? eventCounts.reduce((sum, count) => sum + (count.guests ?? 0), 0)
    : null;
  const now = await readRequestTime();
  const activeAlbums = (events ?? []).filter(
    (event) => getEventLifecycle(event, now).acceptsPhotos
  ).length;

  return (
    <div className={styles.dashboardHome}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Workspace host</p>
          <h1 className={styles.pageTitle}>Cerita acaramu, dalam satu tempat.</h1>
          <p className={styles.pageSubtitle}>
            Pantau jepretan yang masuk, bagikan akses tamu, dan tentukan momen reveal.
          </p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary">
          <Plus size={18} />
          Buat album baru
        </Link>
      </div>

      {!events || events.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Camera size={26} />
          </span>
          <p className={styles.emptyEyebrow}>Album pertamamu</p>
          <h2 className={styles.emptyTitle}>Mulai dari satu QR code.</h2>
          <p className={styles.emptyDesc}>
            Siapkan album dalam sekitar satu menit. Tamu cukup memindai QR, membuka kamera,
            lalu setiap candid tersimpan otomatis.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary">
            <Plus size={17} />
            Buat album sekarang
          </Link>
        </div>
      ) : (
        <>
          <section className={styles.overview} aria-label="Ringkasan semua album">
            <div className={styles.overviewCard}>
              <span className={styles.overviewIcon}><Sparkles size={17} /></span>
              <span className={styles.overviewValue}>{events.length}</span>
              <span className={styles.overviewLabel}>Total album</span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewIcon}><Images size={17} /></span>
              <span className={styles.overviewValue}>{totalPhotos ?? "—"}</span>
              <span className={styles.overviewLabel}>Foto tersimpan</span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewIcon}><Users size={17} /></span>
              <span className={styles.overviewValue}>{totalGuests ?? "—"}</span>
              <span className={styles.overviewLabel}>Tamu bergabung</span>
            </div>
            <div className={styles.overviewCard}>
              <span className={styles.overviewIcon}><Camera size={17} /></span>
              <span className={styles.overviewValue}>{activeAlbums}</span>
              <span className={styles.overviewLabel}>Album aktif</span>
            </div>
          </section>

          <section className={styles.albumSection}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Koleksi</p>
                <h2>Album acara</h2>
              </div>
              <span>{events.length} album</span>
            </div>

            <div className={styles.eventGrid}>
              {events.map((event, index) => {
                const lifecycle = getEventLifecycle(event, now);
                const photoCount = photoCounts.get(event.id);
                const guestCount = guestCounts.get(event.id);
                return (
                  <Link
                    key={event.id}
                    href={`/dashboard/events/${event.id}`}
                    className={styles.eventCard}
                  >
                    <div className={styles.eventVisual} data-tone={index % 4}>
                      <span className={styles.eventIndex}>{String(index + 1).padStart(2, "0")}</span>
                      <Camera size={28} strokeWidth={1.35} />
                      <span className={styles.statusBadge} data-status={lifecycle.tone}>
                        <span className={styles.statusDot} />
                        {lifecycle.label}
                      </span>
                    </div>

                    <div className={styles.eventCardBody}>
                      <div className={styles.eventCardHeader}>
                        <div>
                          <h3 className={styles.eventTitle}>{event.title}</h3>
                          <p className={styles.eventDate}>
                            <CalendarDays size={13} />
                            {formatDate(event.event_date)}
                          </p>
                        </div>
                        <ArrowUpRight size={18} className={styles.eventArrow} />
                      </div>

                      <div className={styles.eventStats}>
                        <div className={styles.statItem}>
                          <strong>{photoCount ?? "—"}</strong>
                          <span>foto</span>
                        </div>
                        <div className={styles.statItem}>
                          <strong>{guestCount ?? "—"}</strong>
                          <span>tamu</span>
                        </div>
                        <div className={styles.statItem}>
                          <strong>{event.shots_per_guest}</strong>
                          <span>jepretan/tamu</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
