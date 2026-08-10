"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Loader2 } from "lucide-react";
import styles from "./Login.module.css";

type Mode = "password" | "magic";

/** Terjemahan pesan Supabase yang paling sering terlihat host. */
function translate(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Email atau kata sandi salah.",
    "Email not confirmed": "Emailmu belum dikonfirmasi. Cek kotak masuk.",
    "User already registered": "Email ini sudah terdaftar. Masuk saja.",
    "Unsupported provider: provider is not enabled":
      "Login Google belum diaktifkan. Pakai email saja untuk sekarang.",
  };
  if (map[message]) return map[message];
  if (message.includes("Password should be at least"))
    return "Kata sandi minimal 6 karakter.";
  return message;
}

export default function AuthForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("password");
  const [signingUp, setSigningUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    initialError ? { type: "error", text: initialError } : null
  );

  const handleGoogleLogin = async () => {
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    // Kalau provider Google belum diaktifkan di dashboard Supabase, panggilan
    // ini gagal tanpa berpindah halaman. Tanpa menampilkan errornya, tombol
    // terasa rusak begitu saja — diklik, tidak terjadi apa-apa.
    if (error) setMessage({ type: "error", text: translate(error.message) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMessage({ type: "success", text: "Cek emailmu untuk tautan masuk." });
        return;
      }

      if (signingUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;

        /*
         * Kalau konfirmasi email masih aktif di Supabase, `session` kosong dan
         * akunnya belum bisa dipakai sampai tautannya diklik. Membedakan dua
         * keadaan ini penting: tanpa itu, orang mengira sudah masuk lalu
         * bingung kenapa dashboard-nya menolak.
         */
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setMessage({
            type: "success",
            text: "Akun dibuat. Cek emailmu untuk mengonfirmasi, lalu masuk.",
          });
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // `refresh()` wajib: middleware membaca cookie sesi di sisi server, dan
      // tanpa ini navigasinya memakai render lama yang masih menganggap kita
      // belum masuk.
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: translate(err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authForm}>
      <button onClick={handleGoogleLogin} className={styles.googleBtn} type="button">
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
          </g>
        </svg>
        Lanjutkan dengan Google
      </button>

      <div className={styles.divider}>
        <span>atau</span>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <Mail size={18} className={styles.inputIcon} />
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            disabled={loading}
            autoComplete="email"
          />
        </div>

        {mode === "password" && (
          <div className={styles.inputGroup}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              type="password"
              placeholder="Kata sandi"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              disabled={loading}
              // Beri tahu pengelola kata sandi ini kolom mana; tanpa ini
              // browser sering menawarkan menyimpan sandi lama saat mendaftar.
              autoComplete={signingUp ? "new-password" : "current-password"}
            />
          </div>
        )}

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : mode === "magic" ? (
            "Kirim tautan masuk"
          ) : signingUp ? (
            "Buat akun"
          ) : (
            "Masuk"
          )}
        </button>
      </form>

      <div className={styles.switchRow}>
        {mode === "password" ? (
          <>
            <button
              type="button"
              className={styles.switchLink}
              onClick={() => {
                setSigningUp((v) => !v);
                setMessage(null);
              }}
            >
              {signingUp ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
            </button>
            <button
              type="button"
              className={styles.switchLink}
              onClick={() => {
                setMode("magic");
                setMessage(null);
              }}
            >
              Kirim tautan lewat email
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.switchLink}
            onClick={() => {
              setMode("password");
              setMessage(null);
            }}
          >
            Pakai kata sandi
          </button>
        )}
      </div>
    </div>
  );
}
