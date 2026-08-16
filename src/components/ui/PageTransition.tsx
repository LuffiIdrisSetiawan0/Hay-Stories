"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./PageTransition.module.css";

type TransitionStatus = "idle" | "entering" | "holding" | "exiting";

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [status, setStatus] = useState<TransitionStatus>("idle");
  const [displayLocation, setDisplayLocation] = useState(pathname);
  const pendingHrefRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any safety timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // When route changes, trigger the exit (uncover) animation
  useEffect(() => {
    const currentFull = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    if (currentFull !== displayLocation) {
      setDisplayLocation(currentFull);

      if (status === "entering" || status === "holding") {
        // Small hold to ensure DOM updates, then slide curtain away up to -100%
        setStatus("exiting");
        window.scrollTo(0, 0);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setStatus("idle");
          pendingHrefRef.current = null;
        }, 580);
      }
    }
  }, [pathname, searchParams, displayLocation, status]);

  // Navigate with curtain slide animation
  const navigateWithTransition = useCallback(
    (href: string) => {
      if (status !== "idle") return;

      const currentPath = window.location.pathname + window.location.search;
      // If navigating to the same URL or on-page hash, skip curtain
      if (href === currentPath || href.startsWith("#")) {
        return;
      }

      pendingHrefRef.current = href;
      setStatus("entering");

      // Slide up takes 520ms, then push route
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setStatus("holding");
        startTransition(() => {
          router.push(href);
        });

        // Safety fallback in case route navigation stalls
        timeoutRef.current = setTimeout(() => {
          setStatus("exiting");
          timeoutRef.current = setTimeout(() => {
            setStatus("idle");
            pendingHrefRef.current = null;
          }, 580);
        }, 1500);
      }, 540);
    },
    [router, status]
  );

  // Global click interception for internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only handle standard primary clicks without modifier keys
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) {
        return;
      }

      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, downloads, target="_blank", mailto, tel, javascript
      if (
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        // If external link is same origin, we can still transition
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) {
            return;
          }
        } catch {
          return;
        }
      }

      // If it's a hash-only anchor on the current page (e.g. #kenapa, #cara-kerja)
      if (href.startsWith("#")) {
        return;
      }

      // Check if href is same page hash (e.g. /#cara-kerja when already on /)
      const currentPath = window.location.pathname;
      if (href.startsWith("/#") && currentPath === "/") {
        return;
      }

      // Trigger seamless curtain transition
      e.preventDefault();
      navigateWithTransition(href);
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [navigateWithTransition]);

  if (status === "idle") return null;

  return (
    <div
      className={`${styles.overlay} ${
        status === "entering"
          ? styles.entering
          : status === "holding"
          ? styles.holding
          : styles.exiting
      }`}
      aria-hidden="true"
    >
      <div className={styles.curtain}>
        {/* Subtle SVG Film Grain Overlay */}
        <div className={styles.noise} />

        {/* Viewfinder Corners */}
        <div className={styles.frame}>
          <span className={styles.cornerTL} />
          <span className={styles.cornerTR} />
          <span className={styles.cornerBL} />
          <span className={styles.cornerBR} />
        </div>

        {/* Centered Brand Mark */}
        <div className={styles.brand}>
          <span className={styles.logoText}>HAY STORIES</span>
          <span className={styles.tagline}>DIGITAL DISPOSABLE CAMERA</span>
        </div>
      </div>
    </div>
  );
}
