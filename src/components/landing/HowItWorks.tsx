import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import BigWord from "@/components/ui/BigWord";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    number: "01",
    title: "Pasang QR Code",
    description:
      "Cetak kartu QR kami di meja tamu atau tampilkan di layar utama acara. Desain siap pakai dan mudah ditempatkan di mana saja.",
  },
  {
    number: "02",
    title: "Tamu Scan & Motret",
    description:
      "Tamu memindai QR dan langsung masuk ke kamera web analog. Bebas memilih filter roll film tanpa perlu download aplikasi atau bikin akun.",
  },
  {
    number: "03",
    title: "Terkumpul Otomatis",
    description:
      "Semua foto candid otomatis masuk ke galeri digital pribadi Anda. Siap ditayangkan langsung ke proyektor dan diunduh dalam file ZIP resolusi penuh.",
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
            3 langkah instan dan praktis, tanpa perlu dijelaskan panjang lebar ke tamu.
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
