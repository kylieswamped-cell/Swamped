"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

// Smooth scrolling is a marketing-site effect. The app, auth, and customer
// pages keep the browser's native scrolling, which modals and other scrollable
// panels rely on.
const MARKETING_PAGES = new Set(["/", "/about", "/contact", "/partner", "/pricing", "/terms", "/privacy"]);

export default function SmoothScroll() {
  const pathname = usePathname();
  const enabled = MARKETING_PAGES.has(pathname);

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      // Let scrollable panels (menus, dialogs, long lists) scroll natively.
      allowNestedScroll: true,
      prevent: (node) => Boolean(node.closest('[role="dialog"], [aria-modal="true"]')),
    });

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
