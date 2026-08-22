"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./PageTransition.module.css";

type TransitionStatus = "idle" | "entering" | "holding" | "exiting";

// Paths that should navigate immediately without curtain loading transition
const EXCLUDED_PREFIXES = ["/login", "/dashboard", "/auth", "/a/"];

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [status, setStatus] = useState<TransitionStatus>("idle");
  const search = searchParams.toString();
  const currentLocation = pathname + (search ? `?${search}` : "");
  const previousLocationRef = useRef(currentLocation);
  const pendingHrefRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any safety timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // When route changes, trigger the exit (uncover) animation
  useEffect(() => {
    if (currentLocation === previousLocationRef.current) return;
    previousLocationRef.current = currentLocation;

    // Back/forward navigation does not start the curtain, so there is nothing
    // to uncover. A pending href is only set by navigateWithTransition().
    if (!pendingHrefRef.current) return;

    const pendingTarget = new URL(pendingHrefRef.current, window.location.origin);
    if (!pendingTarget.hash) window.scrollTo(0, 0);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Defer the state update to the next frame so the effect only synchronizes
    // with the completed Next.js navigation.
    const frame = window.requestAnimationFrame(() => {
      setStatus("exiting");
      timeoutRef.current = setTimeout(() => {
        setStatus("idle");
        pendingHrefRef.current = null;
      }, 380);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentLocation]);

  // Keep the branded wipe short: it should acknowledge a click without
  // delaying when Next.js starts loading the destination.
  const navigateWithTransition = useCallback(
    (href: string) => {
      if (status !== "idle") return;

      const currentPath = window.location.pathname + window.location.search;
      // If navigating to the same URL or on-page hash, skip curtain
      if (href === currentPath || href.startsWith("#")) {
        return;
      }

      // Check if target or current path is in excluded list (login, dashboard, etc.)
      const targetPath = href.startsWith("http")
        ? new URL(href).pathname
        : href.split("?")[0].split("#")[0];

      if (
        EXCLUDED_PREFIXES.some((prefix) => targetPath.startsWith(prefix)) ||
        EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
      ) {
        return;
      }

      pendingHrefRef.current = href;
      setStatus("entering");

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Let the curtain cover the current page before swapping routes.
      timeoutRef.current = setTimeout(() => {
        setStatus("holding");
        startTransition(() => {
          router.push(href);
        });

        // Safety fallback in case route navigation stalls.
        timeoutRef.current = setTimeout(() => {
          setStatus("exiting");
          timeoutRef.current = setTimeout(() => {
            setStatus("idle");
            pendingHrefRef.current = null;
          }, 380);
        }, 1600);
      }, 280);
    },
    [router, status, pathname]
  );

  // Global click interception for internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only handle standard primary clicks without modifier keys
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // A link that explicitly controls its browsing context or download
      // behavior must retain native browser semantics, even when same-origin.
      if (target.hasAttribute("target") || target.hasAttribute("download")) {
        return;
      }

      // Ignore external links and non-navigation protocols.
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
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

      // Exclude login, dashboard, and auth routes from loading curtain
      const targetPath = href.startsWith("http")
        ? new URL(href).pathname
        : href.split("?")[0].split("#")[0];

      if (
        EXCLUDED_PREFIXES.some((prefix) => targetPath.startsWith(prefix)) ||
        EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
      ) {
        return; // Standard fast navigation without loading curtain
      }

      // Trigger seamless curtain transition for marketing/public event pages
      e.preventDefault();
      navigateWithTransition(href);
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [navigateWithTransition, pathname]);

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
        {/* Subtle SVG Film Noise Backdrop */}
        <div className={styles.noise} />

        {/* Viewfinder Corners */}
        <div className={styles.frame}>
          <span className={styles.cornerTL} />
          <span className={styles.cornerTR} />
          <span className={styles.cornerBL} />
          <span className={styles.cornerBR} />
        </div>

        {/* Centered brand mark and subtle progress indicator */}
        <div className={styles.brand}>
          <span className={styles.logoText}>HAY STORIES</span>
          <span className={styles.tagline}>KAMERA TAMU DIGITAL</span>
          <div className={styles.loaderBar}>
            <div className={styles.loaderProgress} />
          </div>
        </div>
      </div>
    </div>
  );
}
