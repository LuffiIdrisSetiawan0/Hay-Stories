"use client";

import { useEffect, useRef } from "react";

/** Dipanggil tiap frame gulir, dengan kemajuan 0–1 dan simpul seksinya. */
type FrameHandler = (progress: number, root: HTMLElement) => void;

/**
 * Mengukur kemajuan gulir sebuah seksi yang dipaku.
 *
 * Polanya selalu sama: satu `<section>` tinggi berisi satu panggung
 * `position: sticky` setinggi layar, lalu beberapa pengganjal setinggi layar
 * di bawahnya. Selama pengganjal itu lewat, panggungnya diam di puncak layar
 * dan isinya bergerak — itulah yang membuat kartu terlihat menyapu mendatar
 * padahal jempolnya menggulir ke bawah.
 *
 * Kemajuannya ditulis sebagai `--p` di seksi itu sendiri, bukan disimpan di
 * state React. Menyimpannya di state berarti satu render untuk tiap frame
 * gulir; menulis variabel CSS hanya menyentuh satu properti dan animasinya
 * tetap berjalan di lapisan komposit.
 *
 * Jaraknya diukur dari tinggi panggung yang sesungguhnya (`[data-stage]`),
 * bukan dari `window.innerHeight`. Di ponsel keduanya berbeda setiap kali bilah
 * alamat menyusut, dan memakai `innerHeight` membuat kartu meleset pelan-pelan
 * selama pengguna menggulir.
 *
 * Ketika pengguna meminta gerakan dikurangi, hook ini diam sepenuhnya: CSS yang
 * mengambil alih dengan melepas pakunya dan menjadikan relnya bisa digulir
 * tangan.
 */
export function usePinProgress<T extends HTMLElement = HTMLElement>(onFrame?: FrameHandler) {
  const ref = useRef<T>(null);
  // Disimpan di ref supaya pemanggil boleh menulis callback inline tanpa
  // membuat listener gulirnya dipasang ulang tiap render. Penyalinannya harus
  // di dalam efek, bukan langsung saat render: menulis ref selagi merender
  // adalah jenis efek samping yang dilarang React.
  const handlerRef = useRef(onFrame);
  useEffect(() => {
    handlerRef.current = onFrame;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = -1;

    const read = () => {
      if (reduced.matches) {
        root.style.removeProperty("--p");
        return;
      }

      const stage = root.querySelector<HTMLElement>("[data-stage]");
      const span = root.offsetHeight - (stage?.offsetHeight ?? window.innerHeight);
      if (span <= 0) return;

      const travelled = -root.getBoundingClientRect().top;
      const progress = Math.min(Math.max(travelled / span, 0), 1);

      // Frame yang tidak mengubah apa pun tidak perlu menyentuh gaya sama
      // sekali — gulir di luar seksi ini memicu handler yang sama.
      if (Math.abs(progress - last) < 0.0005) return;
      last = progress;

      root.style.setProperty("--p", progress.toFixed(4));
      handlerRef.current?.(progress, root);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reduced.addEventListener("change", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduced.removeEventListener("change", onScroll);
    };
  }, []);

  return ref;
}
