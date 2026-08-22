import type { Metadata } from 'next'
import LegalPage, {
  LegalList,
  LegalNote,
  LegalSection,
  type LegalNavItem,
} from '@/components/ui/LegalPage'
import { SUPPORT_EMAIL, supportMailto } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Syarat Penggunaan',
  description:
    'Ketentuan penggunaan kamera acara, album, akun host, konten tamu, paket, dan layanan HAY Stories.',
  alternates: { canonical: '/syarat' },
}

const SECTIONS = [
  { id: 'persetujuan', label: 'Persetujuan' },
  { id: 'akun', label: 'Akun host' },
  { id: 'layanan', label: 'Cara layanan bekerja' },
  { id: 'tanggung-jawab', label: 'Tanggung jawab acara' },
  { id: 'konten', label: 'Konten dan izin' },
  { id: 'larangan', label: 'Penggunaan terlarang' },
  { id: 'paket', label: 'Paket dan pembayaran' },
  { id: 'ketersediaan', label: 'Ketersediaan' },
  { id: 'kekayaan-intelektual', label: 'Kekayaan intelektual' },
  { id: 'pengakhiran', label: 'Penangguhan dan pengakhiran' },
  { id: 'tanggung-gugat', label: 'Batas tanggung jawab' },
  { id: 'hukum-kontak', label: 'Perubahan, hukum, dan kontak' },
] as const satisfies readonly LegalNavItem[]

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Dokumen legal · Syarat"
      title="Aturan sederhana untuk cerita bersama."
      intro="Syarat ini mengatur penggunaan situs, akun host, kamera tamu, voice guestbook, dan galeri HAY Stories. Kami menuliskannya agar tanggung jawab setiap pihak jelas sebelum QR dibagikan."
      updated="22 Agustus 2026"
      updatedDateTime="2026-08-22"
      sections={SECTIONS}
    >
      <LegalSection id="persetujuan" number="01" title="Persetujuan terhadap syarat">
        <p>
          Dengan membuat akun, membuat album, bergabung ke acara, atau menggunakan fitur HAY
          Stories, Anda menyetujui Syarat Penggunaan ini dan <a href="/privasi">Kebijakan Privasi</a>.
          Jika Anda menggunakan layanan untuk organisasi atau pemilik acara lain, Anda menyatakan
          berwenang menerima syarat ini atas nama mereka.
        </p>
      </LegalSection>

      <LegalSection id="akun" number="02" title="Akun host dan kelayakan">
        <p>
          Host harus dapat membuat perjanjian yang sah. Pengguna di bawah usia yang disyaratkan
          hukum harus menggunakan layanan dengan keterlibatan orang tua atau wali. Anda bertanggung
          jawab atas ketepatan informasi akun, keamanan email dan metode login, serta seluruh
          aktivitas yang dilakukan melalui sesi Anda.
        </p>
        <p>
          Segera hubungi kami bila menduga akun diambil alih. Kami dapat meminta verifikasi yang
          wajar sebelum memulihkan akses atau memproses permintaan terkait data.
        </p>
      </LegalSection>

      <LegalSection id="layanan" number="03" title="Cara layanan bekerja">
        <p>
          Host membuat album dan memperoleh QR, tautan, atau kode akses. Tamu membuka kamera di
          browser, memilih look dan bingkai, lalu mengunggah foto ke album. Tamu juga dapat merekam
          ucapan suara singkat yang hanya dapat didengar host. Host menentukan waktu reveal dan
          pengaturan akses yang tersedia pada paketnya.
        </p>
        <LegalNote>
          <p>
            HAY Stories adalah pelengkap dokumentasi acara, bukan pengganti fotografer profesional,
            sistem arsip permanen, atau layanan penyimpanan cadangan. Unduh foto penting sebelum
            masa retensi album berakhir.
          </p>
        </LegalNote>
      </LegalSection>

      <LegalSection id="tanggung-jawab" number="04" title="Tanggung jawab host dan penyelenggara">
        <LegalList>
          <li>memberi tahu tamu bahwa foto dan ucapan yang mereka kirim akan disimpan dalam album;</li>
          <li>memperoleh izin tempat, peserta, orang tua/wali, atau pihak lain bila diperlukan;</li>
          <li>menempatkan QR dan membagikan tautan hanya kepada audiens yang dituju;</li>
          <li>meninjau serta menghapus konten yang melanggar hak, privasi, atau keselamatan; dan</li>
          <li>mengunduh salinan konten sebelum album kedaluwarsa.</li>
        </LegalList>
        <p>
          Host mengendalikan konteks acara dan distribusi tautan. Status “tidak tercantum publik”
          tidak berarti album dilindungi kata sandi; penerima tautan dapat meneruskannya.
        </p>
      </LegalSection>

      <LegalSection id="konten" number="05" title="Konten, kepemilikan, dan izin">
        <p>
          Anda tetap memiliki hak atas konten yang Anda unggah. Anda memberi HAY Stories lisensi
          non-eksklusif, terbatas, dan berlaku selama diperlukan untuk menyimpan, memproses,
          menampilkan, dan mengirim konten semata-mata agar layanan berjalan dan permintaan Anda
          dapat dipenuhi.
        </p>
        <p>
          Anda hanya boleh mengunggah konten yang boleh Anda ambil dan bagikan. Jangan mengunggah
          materi yang melanggar hak cipta, privasi, kerahasiaan, atau hak lain. Tamu memahami bahwa
          foto yang disimpan ke album dapat dilihat host dan peserta lain setelah reveal. Rekaman
          voice guestbook bersifat privat dan hanya dapat diakses host album.
        </p>
      </LegalSection>

      <LegalSection id="larangan" number="06" title="Penggunaan yang tidak diperbolehkan">
        <LegalList>
          <li>konten ilegal, eksploitatif, mengancam, penuh kebencian, atau seksual tanpa persetujuan;</li>
          <li>materi yang mengeksploitasi atau membahayakan anak;</li>
          <li>penyamaran, penipuan, pelecehan, doxing, atau pelanggaran privasi;</li>
          <li>malware, pengujian beban tanpa izin, scraping agresif, atau upaya melewati kuota;</li>
          <li>mengakses akun, album, foto, rekaman suara, atau sistem yang bukan hak Anda; serta</li>
          <li>menjual kembali layanan atau merek HAY Stories tanpa persetujuan tertulis.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="paket" number="07" title="Paket, kuota, dan pembayaran">
        <p>
          Fitur, jumlah tamu, jepretan, masa aktif, dan retensi mengikuti informasi paket yang
          ditampilkan saat album dibuat atau dibeli. Paket Starter tersedia tanpa biaya, sedangkan
          paket berbayar diaktifkan setelah pembayaran terkonfirmasi. Informasi di halaman harga
          menunjukkan apa yang benar-benar dapat digunakan atau dibeli.
        </p>
        <p>
          Order yang belum dibayar dapat ditinggalkan dan akan kedaluwarsa mengikuti batas waktu
          penyedia pembayaran; album tetap berstatus draf. Jangan membayar melalui nomor pribadi
          atau kanal yang tidak ditampilkan resmi di dalam layanan. Jika saldo sudah terpotong,
          periksa status order sebelum membuat pembayaran baru.
        </p>
        <p>
          Setelah Midtrans mengonfirmasi settlement atau pembayaran kartu yang diterima, paket
          layanan digital segera diaktifkan. Pembatalan acara atau perubahan pikiran setelah
          aktivasi tidak otomatis memberi hak refund. Permohonan refund hanya dipertimbangkan untuk:
        </p>
        <LegalList>
          <li>tagihan duplikat untuk album dan pembelian yang sama;</li>
          <li>
            pembayaran telah terkonfirmasi tetapi album gagal aktif dan tidak dapat kami pulihkan
            dalam waktu yang wajar; atau
          </li>
          <li>keadaan lain ketika pengembalian dana diwajibkan oleh hukum.</li>
        </LegalList>
        {SUPPORT_EMAIL ? (
          <p>
            Untuk dua kondisi operasional pertama, kirim permohonan paling lambat 7 hari kalender
            setelah pembayaran terkonfirmasi ke{' '}
            <a href={supportMailto('Permohonan refund HAY Stories')}>{SUPPORT_EMAIL}</a>. Sertakan
            ID order dan email akun, tetapi jangan mengirim PIN atau data kartu lengkap. Waktu dana
            diterima kembali bergantung pada peninjauan serta proses Midtrans, bank, atau kanal bayar.
          </p>
        ) : (
          <LegalNote>
            <p>
              Kanal refund melalui email belum tersedia pada deployment ini. Paket berbayar tidak
              boleh diaktifkan sampai alamat dukungan yang dimonitor telah dikonfigurasi.
            </p>
          </LegalNote>
        )}
        <p>
          Batas pengajuan administratif di atas tidak mengurangi hak konsumen atau upaya hukum yang
          tidak boleh dibatasi. Harga paket ditampilkan pada ringkasan order. Jika kanal pembayaran
          mengenakan biaya administrasi atau layanan, Midtrans akan menampilkannya sebelum pengguna
          mengonfirmasi pembayaran; jangan lanjutkan bila total yang ditampilkan tidak sesuai.
        </p>
      </LegalSection>

      <LegalSection id="ketersediaan" number="08" title="Ketersediaan dan kualitas hasil">
        <p>
          Kamera web bergantung pada izin browser, sensor perangkat, cahaya, koneksi, sistem operasi,
          dan dukungan WebGL. Look film, ketajaman, warna, dan kecepatan unggah dapat berbeda antar
          perangkat. Kami dapat melakukan pemeliharaan atau mengubah fitur untuk keamanan dan
          keandalan, serta akan berupaya menyampaikan perubahan material secara wajar.
        </p>
      </LegalSection>

      <LegalSection id="kekayaan-intelektual" number="09" title="Merek dan kekayaan intelektual">
        <p>
          Selain konten pengguna, situs, desain, kode, teks, nama HAY Stories, dan aset merek
          dilindungi oleh hak yang berlaku. Komponen pihak ketiga tetap tunduk pada lisensinya;
          atribusi yang relevan tersedia di halaman <a href="/kredit">Kredit &amp; Lisensi</a>.
          Tidak ada dalam syarat ini yang memindahkan kepemilikan merek atau teknologi layanan.
        </p>
      </LegalSection>

      <LegalSection id="pengakhiran" number="10" title="Penangguhan dan pengakhiran">
        <p>
          Anda dapat berhenti menggunakan layanan kapan saja. Kami dapat membatasi atau menangguhkan
          akses bila diperlukan untuk melindungi pengguna dan sistem, menanggapi kewajiban hukum,
          menangani pembayaran bermasalah, atau menghentikan pelanggaran syarat. Bila layak, kami
          akan memberi kesempatan untuk memperbaiki pelanggaran sebelum penghentian permanen.
        </p>
      </LegalSection>

      <LegalSection id="tanggung-gugat" number="11" title="Jaminan dan batas tanggung jawab">
        <p>
          Layanan diberikan berdasarkan ketersediaan. Kami berupaya menjaga fungsi dan keamanan,
          tetapi tidak menjamin layanan tanpa gangguan, kompatibel dengan setiap perangkat, atau
          bahwa setiap jepretan dan unggahan selalu berhasil. Host tetap wajib menyimpan salinan
          konten penting.
        </p>
        <p>
          Sejauh diizinkan hukum, HAY Stories tidak bertanggung jawab atas kerugian tidak langsung,
          hilangnya peluang, atau hilangnya konten yang timbul dari perangkat, jaringan, tindakan
          pengguna lain, pembagian tautan, atau kejadian di luar kendali wajar kami. Ketentuan ini
          tidak membatasi hak konsumen atau tanggung jawab yang tidak boleh dikesampingkan oleh hukum.
        </p>
      </LegalSection>

      <LegalSection id="hukum-kontak" number="12" title="Perubahan, hukum, dan kontak">
        <p>
          Kami dapat memperbarui syarat ini ketika layanan atau hukum berubah. Tanggal berlaku di
          atas akan diperbarui dan perubahan material akan diberitahukan secara wajar bila diperlukan.
          Syarat ini ditafsirkan menurut hukum Republik Indonesia. Perselisihan sebaiknya diselesaikan
          terlebih dahulu melalui musyawarah sebelum diajukan ke forum yang berwenang.
        </p>
        {SUPPORT_EMAIL && (
          <p>
            Pertanyaan tentang syarat dapat dikirim ke{' '}
            <a href={supportMailto('Syarat HAY Stories')}>{SUPPORT_EMAIL}</a>.
          </p>
        )}
      </LegalSection>
    </LegalPage>
  )
}
