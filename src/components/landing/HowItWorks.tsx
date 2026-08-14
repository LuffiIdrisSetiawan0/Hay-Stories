import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import BigWord from "@/components/ui/BigWord";
import styles from "./HowItWorks.module.css";

/**
 * Tiga langkah, rata tengah, dipimpin satu kata raksasa.
 *
 * Angkanya yang jadi penanda dan sisanya ruang kosong — tidak ada lingkaran
 * ikon dan tidak ada garis penghubung. Untuk sesuatu yang isinya cuma tiga
 * kalimat, keduanya cuma menambah ramai.
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
        <Reveal className={styles.head} direction="blur">
          <BigWord as="h2">Caranya</BigWord>
        </Reveal>

        <p className={styles.lede}>
          <SplitText by="word" delay={100}>
            Tiga langkah, dan tamumu tidak perlu dijelaskan satu pun.
          </SplitText>
        </p>

        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.number} className={styles.step}>
              <Reveal direction="sweep" delay={index * 130} className={styles.rule} />
              <Reveal delay={index * 130 + 90}>
                <span className={styles.number}>{step.number}</span>
                <h3 className={styles.title}>{step.title}</h3>
                <p className={styles.desc}>{step.description}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
