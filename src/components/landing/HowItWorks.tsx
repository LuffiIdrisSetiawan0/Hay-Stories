import Reveal from "@/components/ui/Reveal";
import BigWord from "@/components/ui/BigWord";
import styles from "./HowItWorks.module.css";

/**
 * Tiga langkah, rata tengah, dipimpin satu kata raksasa.
 *
 * Versi sebelumnya memakai lingkaran ikon dan tata letak berselang-seling
 * kiri-kanan dengan garis penghubung. Ramai untuk sesuatu yang isinya cuma tiga
 * kalimat; sekarang angkanya yang jadi penanda dan sisanya ruang kosong.
 */
const steps = [
  {
    number: "01",
    title: "Pindai QR",
    description:
      "Tamu memindai QR code di meja atau layar. Langsung terbuka di browser — tidak ada aplikasi yang perlu diunduh.",
  },
  {
    number: "02",
    title: "Jepret",
    description:
      "Mereka memilih sendiri roll filmnya dan bisa berganti kapan saja. Jatah jepretan terbatas, persis kamera analog sungguhan.",
  },
  {
    number: "03",
    title: "Terungkap Bersama",
    description:
      "Semua foto terkunci sampai acara usai, lalu terbuka bersamaan — seperti menunggu klise film selesai dicetak.",
  },
];

export default function HowItWorks() {
  return (
    <section id="cara-kerja" className={styles.section}>
      <div className="container">
        <Reveal className={styles.head}>
          <BigWord>Caranya</BigWord>
        </Reveal>

        <Reveal delay={100} className={styles.lede}>
          <p>Tiga langkah, dan tamumu tidak perlu dijelaskan satu pun.</p>
        </Reveal>

        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 130} as="li" className={styles.step}>
              <span className={styles.number}>{step.number}</span>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.desc}>{step.description}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
