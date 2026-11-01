"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

// Open modals, oldest first. Only the topmost one reacts to Escape, so closing
// a popup opened from another popup doesn't close both.
const stack: symbol[] = [];

/**
 * Centered popup over a dimmed page. Escape, backdrop clicks, and the corner X
 * close it unless `busy`. The X is left out when the content has its own
 * Close button.
 */
export default function Modal({
  open,
  onClose,
  label,
  busy = false,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  busy?: boolean;
  className?: string;
  children: ReactNode;
}) {
  // True only in the browser after hydration, so the portal never mismatches the server HTML.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [ownClose, setOwnClose] = useState(true);

  // Watches the content, since multi-step popups swap what's inside.
  const dialog = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const check = () => setOwnClose(Boolean(el.querySelector('[aria-label^="Close"]:not([data-modal-x])')));
    check();
    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    stack.push(id);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stack.at(-1) === id && !busy && onClose();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
    };
  }, [open, busy, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-navy/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
        >
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${className}`}
          >
            {children}
            {!ownClose && (
              <button
                type="button"
                data-modal-x
                onClick={() => !busy && onClose()}
                disabled={busy}
                aria-label="Close dialog"
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-navy disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
