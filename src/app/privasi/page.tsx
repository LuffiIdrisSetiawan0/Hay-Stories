import type { Metadata } from 'next'
import LegalPage, {
  LegalList,
  LegalNote,
  LegalSection,
  type LegalNavItem,
} from '@/components/ui/LegalPage'
import { SUPPORT_EMAIL, supportMailto } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description:
    'Cara HAY Stories memproses dan melindungi data host, tamu, foto, rekaman voice guestbook, serta transaksi pembayaran.',
  alternates: { canonical: '/privasi' },
}

const SECTIONS = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'data', label: 'Data yang diproses' },
  { id: 'penggunaan', label: 'Cara data digunakan' },
  { id: 'kamera-album', label: 'Kamera dan akses album' },
  { id: 'penyimpanan', label: 'Penyimpanan dan pihak lain' },
  { id: 'pilihan', label: 'Pilihan dan hak Anda' },
  { id: 'keamanan', label: 'Keamanan' },
  { id: 'anak', label: 'Pengguna di bawah umur' },
  { id: 'perubahan', label: 'Perubahan dan kontak' },
] as const satisfies readonly LegalNavItem[]

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Dokumen legal · Privasi"
      title="Cerita milikmu. Data tetap terkendali."
      intro="Kebijakan ini menjelaskan data yang diperlukan untuk menjalankan kamera dan voice guestbook acara, siapa yang dapat mengakses konten, serta pilihan yang tersedia bagi host maupun tamu."
      updated="22 Agustus 2026"
      updatedDateTime="2026-08-22"
      sections={SECTIONS}
    >
      <LegalSection id="ringkasan" number="01" title="Ringkasan yang mudah dipahami">
        <p>
          HAY Stories adalah layanan kamera acara berbasis web. <strong>Host</strong> membuat album
          dan membagikan QR atau tautan; <strong>tamu</strong> memilih nama tampilan, memotret, dan
          mengirim hasil ke album tersebut. Kami memproses data hanya untuk menyediakan,
          mengamankan, dan memperbaiki layanan ini.
        </p>
        <LegalNote>
          <p>
            Album tidak dicantumkan dalam direktori publik, tetapi tautan bukan kata sandi.
            Siapa pun yang menerima tautan dapat meneruskannya. Host perlu membagikannya hanya
            kepada orang yang tepat.
          </p>
        </LegalNote>
      </LegalSection>

      <LegalSection id="data" number="02" title="Data yang kami proses">
        <LegalList>
          <li>
            <strong>Data akun host:</strong> alamat email, identitas autentikasi, serta nama atau
            foto profil bila diberikan oleh penyedia login.
          </li>
          <li>
            <strong>Data acara:</strong> judul, jenis dan waktu acara, slug/kode akses, pengaturan
            reveal, kuota, status paket, serta statistik penggunaan.
          </li>
          <li>
            <strong>Data tamu:</strong> nama tampilan, ID sesi acak, album yang diikuti, jumlah
            jepretan, dan waktu aktivitas. Tamu tidak perlu membuat akun HAY Stories.
          </li>
          <li>
            <strong>Foto dan metadata:</strong> foto penuh, pratinjau, waktu pengambilan, preset,
            bingkai, dimensi, ukuran berkas, dan status unggahan.
          </li>
          <li>
            <strong>Voice guestbook:</strong> rekaman suara maksimal 20 detik, catatan opsional,
            nama tampilan tamu, durasi, format, ukuran berkas, waktu pengiriman, dan status moderasi.
          </li>
          <li>
            <strong>Data pembayaran:</strong> ID order dan transaksi, paket, nominal, status,
            metode pembayaran, serta waktu pembaruan transaksi. Data kartu, PIN, dan kredensial
            rekening tidak diterima atau disimpan oleh HAY Stories.
          </li>
          <li>
            <strong>Data teknis:</strong> cookie/token sesi esensial serta catatan teknis standar
            seperti alamat IP, user-agent, waktu permintaan, dan error yang dapat dicatat oleh
            aplikasi atau penyedia infrastrukturnya.
          </li>
        </LegalList>
        <p>
          Fungsi inti saat kebijakan ini diterbitkan tidak menggunakan cookie iklan. Jika kami
          kelak menambahkan analitik atau teknologi non-esensial, kebijakan dan pilihan persetujuan
          akan diperbarui terlebih dahulu sesuai kebutuhan.
        </p>
      </LegalSection>

      <LegalSection id="penggunaan" number="03" title="Untuk apa data digunakan">
        <LegalList>
          <li>membuat dan mengamankan akun, sesi host, dan sesi tamu;</li>
          <li>menjalankan kamera, voice guestbook, kuota, preset film, galeri, pemutaran, dan unduhan;</li>
          <li>mengirim tautan autentikasi atau pesan layanan yang diminta pengguna;</li>
          <li>membuat order, memverifikasi pembayaran, mengaktifkan paket, dan menangani sengketa;</li>
          <li>mencegah penyalahgunaan, memeriksa unggahan, dan menangani gangguan;</li>
          <li>mengukur performa layanan secara agregat dan mengembangkan fitur; serta</li>
          <li>memenuhi kewajiban hukum atau menanggapi permintaan yang sah.</li>
        </LegalList>
        <p>
          Kami tidak menjual foto atau data pribadi untuk periklanan. Kami juga tidak menggunakan
          foto acara untuk materi promosi atau pelatihan model tanpa izin terpisah dari pihak yang
          berwenang memberikannya.
        </p>
      </LegalSection>

      <LegalSection id="kamera-album" number="04" title="Kamera, voice guestbook, dan akses album">
        <p>
          Pratinjau kamera dan pemrosesan look film berlangsung di perangkat tamu. Foto baru
          dikirim setelah tombol jepret digunakan dan proses simpan dimulai. HAY Stories tidak
          memerlukan akses ke kontak atau lokasi presisi untuk fungsi kamera inti.
        </p>
        <p>
          Host mengatur kapan galeri di-reveal dan dapat menghapus foto dalam albumnya. Tamu yang
          masih memiliki sesi aktif dapat menghapus foto miliknya melalui galeri. Setelah reveal,
          orang yang memiliki tautan album dapat melihat foto sesuai pengaturan acara; karena itu,
          setiap orang sebaiknya meminta persetujuan sebelum memotret atau membagikan foto orang lain.
        </p>
        <p>
          Mikrofon hanya diminta setelah tamu menekan tombol rekam pada halaman voice guestbook.
          Pratinjau suara tetap berada di perangkat sampai tamu memilih untuk mengirim. Rekaman yang
          sudah dikirim bersifat privat: tidak muncul di galeri dan hanya dapat diputar oleh host
          pemilik album melalui tautan sementara. Tamu lain tidak dapat membaca catatan atau
          mendengarkan rekaman tersebut.
        </p>
      </LegalSection>

      <LegalSection id="penyimpanan" number="05" title="Penyimpanan, retensi, dan pihak lain">
        <p>
          Foto dan rekaman suara disimpan dalam bucket privat dan diberikan melalui tautan sementara
          ketika pengguna yang berwenang membuka galeri atau inbox guestbook. Masa simpan mengikuti paket yang ditampilkan saat album
          dibuat; paket Starter saat ini mencantumkan retensi <strong>90 hari</strong>. Penghapusan
          dari sistem aktif atau cadangan dapat memerlukan waktu teknis yang wajar.
        </p>
        <p>
          Kami menggunakan penyedia infrastruktur untuk autentikasi, database, penyimpanan objek,
          hosting, email autentikasi, dan—bila dipilih pengguna—login pihak ketiga. Penyedia tersebut
          hanya menerima data yang diperlukan untuk menjalankan fungsinya dan dapat memproses data
          di wilayah lain sesuai kontrak serta hukum yang berlaku.
        </p>
        <p>
          Pembayaran paket berbayar diproses pada halaman yang di-host <strong>Midtrans</strong>.
          Untuk membuat dan memverifikasi transaksi, kami mengirim ID order, paket dan nominal,
          serta alamat email akun bila tersedia. Midtrans memproses pilihan metode dan kredensial
          pembayaran menurut kebijakan mereka; HAY Stories hanya menerima hasil dan status
          transaksi yang diperlukan untuk mengaktifkan album serta menangani rekonsiliasi.
        </p>
        <p>
          Catatan pembayaran disimpan selama diperlukan untuk pembukuan, verifikasi aktivasi,
          pencegahan penipuan, refund atau sengketa, dan kewajiban hukum. Permintaan penghapusan
          tidak dapat menghapus catatan yang masih wajib kami pertahankan, tetapi data akan dibatasi,
          dihapus, atau dianonimkan ketika tujuan dan kewajiban retensinya berakhir.
        </p>
      </LegalSection>

      <LegalSection id="pilihan" number="06" title="Pilihan dan hak Anda">
        <p>
          Bergantung pada peran dan hukum yang berlaku, Anda dapat meminta akses, koreksi,
          penghapusan, pembatasan, atau penarikan persetujuan atas data pribadi. Host dapat
          menghapus foto maupun rekaman voice guestbook dari dashboard; tamu dapat menghapus foto
          miliknya selama sesi terkait masih dikenali aplikasi.
        </p>
        {SUPPORT_EMAIL ? (
          <p>
            Untuk permintaan lain, kirim email ke{' '}
            <a href={supportMailto('Permintaan data pribadi HAY Stories')}>
              {SUPPORT_EMAIL}
            </a>{' '}
            dengan informasi yang cukup untuk memverifikasi hubungan Anda dengan akun, acara,
            foto, atau transaksi. Sertakan ID order hanya bila permintaan berkaitan dengan
            pembayaran. Jangan mengirim kata sandi, token sesi, PIN, atau data kartu lengkap.
          </p>
        ) : (
          <LegalNote>
            <p>
              Alamat email dukungan belum dipublikasikan pada deployment ini. Jangan mengirim data
              pribadi ke alamat yang mengatasnamakan HAY Stories tetapi tidak tercantum di situs.
            </p>
          </LegalNote>
        )}
      </LegalSection>

      <LegalSection id="keamanan" number="07" title="Cara kami menjaga data">
        <p>
          Kami menerapkan pemisahan akses host, token sesi tamu bertanda tangan, pembatasan kuota,
          validasi unggahan, bucket foto dan audio privat, serta tautan berumur terbatas. Meski begitu, tidak ada
          sistem internet yang bebas risiko. Lindungi akun dan perangkat Anda, jangan membagikan
          tautan album secara publik, dan beri tahu kami bila menemukan aktivitas yang tidak dikenal.
        </p>
      </LegalSection>

      <LegalSection id="anak" number="08" title="Pengguna di bawah umur">
        <p>
          Layanan dapat dipakai pada acara keluarga, tetapi tidak ditujukan untuk anak membuat akun
          host sendiri. Penyelenggara acara bertanggung jawab memperoleh izin orang tua atau wali
          bila diwajibkan, memberi tahu tamu bahwa foto akan masuk ke album bersama, dan menghapus
          konten anak bila tidak semestinya dibagikan.
        </p>
      </LegalSection>

      <LegalSection id="perubahan" number="09" title="Perubahan kebijakan dan kontak">
        <p>
          Kami dapat memperbarui kebijakan ini ketika fitur, penyedia, atau kewajiban hukum berubah.
          Tanggal berlaku di bagian atas akan diperbarui; perubahan material akan diberitahukan lewat
          layanan atau kanal yang wajar sebelum berlaku apabila diwajibkan.
        </p>
        <p>
          Untuk konteks penggunaan layanan, baca juga <a href="/syarat">Syarat Penggunaan</a>.
          {SUPPORT_EMAIL && (
            <>
              {' '}Pertanyaan privasi dapat dikirim ke{' '}
              <a href={supportMailto('Privasi HAY Stories')}>{SUPPORT_EMAIL}</a>.
            </>
          )}
        </p>
      </LegalSection>
    </LegalPage>
  )
}
