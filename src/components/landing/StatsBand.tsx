import { FILM_PRESETS, getTier } from '@/lib/catalog'
import { Section, SectionHeading, StatRow, TitleAccent } from '@/components/ui/Section'

const STARTER = getTier('starter')!

/**
 * Band angka sebagai bukti.
 *
 * Situs agensi memakai slot ini untuk metrik hasil kerja — nilai iklan yang
 * dikelola, angka retensi klien. Kita belum menjalankan satu acara pun, jadi
 * angka semacam itu hanya bisa dikarang, dan angka karangan di halaman harga
 * adalah bohong yang gampang ketahuan.
 *
 * Yang dipakai justru fakta produk yang bisa diperiksa siapa pun langsung dari
 * aplikasinya, dan semuanya dibaca dari katalog supaya tidak pernah berbeda
 * dari yang sebenarnya berlaku.
 *
 * Ganti seksi ini dengan metrik acara sungguhan begitu ada — itu bukti yang
 * jauh lebih kuat.
 */
export default function StatsBand() {
  const stats = [
    { value: '0', label: 'Aplikasi diunduh tamu' },
    { value: String(FILM_PRESETS.length), label: 'Roll film untuk dipilih' },
    { value: String(STARTER.shotsPerGuest), label: 'Jepretan gratis per tamu' },
    { value: `${STARTER.retentionDays}`, label: 'Hari foto tersimpan' },
  ] as const

  return (
    <Section id="angka" tone="tinted">
      <div className="container">
        <SectionHeading
          eyebrow="Yang Kamu Dapat"
          marker="rule"
          title={
            <>
              Tanpa aplikasi, tanpa <TitleAccent>ribet</TitleAccent>
            </>
          }
          subtitle="Tamu memindai QR dan langsung memotret di browser. Tidak ada yang perlu diunduh, tidak ada akun yang perlu dibuat, dan tidak ada satu pun tamu yang perlu dijelaskan caranya."
        />

        <StatRow stats={stats} />
      </div>
    </Section>
  )
}
