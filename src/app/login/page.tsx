import { Metadata } from "next";
import Link from "next/link";
import AuthForm from "./AuthForm";
import styles from "./Login.module.css";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke HAY Stories untuk mulai membuat album.",
};

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>✦</span>
            <span className={styles.logoText}>HAY Stories</span>
          </Link>
        </div>

        <div className={styles.card}>
          <h1 className={styles.title}>Masuk ke akunmu</h1>
          <p className={styles.subtitle}>
            Mulai buat album dan biarkan tamumu yang bercerita.
          </p>

          <AuthForm />
        </div>
      </div>
    </main>
  );
}
