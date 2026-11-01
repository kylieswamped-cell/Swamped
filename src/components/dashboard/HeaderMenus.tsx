"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BadgeCheck, Bell, Clock, DollarSign, Handshake, LifeBuoy, LogOut, Settings, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { signOut } from "@/lib/auth/actions";
import type { AppNotification, NotificationKind } from "@/lib/notifications/data";
import { markNotificationsRead } from "@/lib/notifications/actions";

function initials(name: string) {
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function timeAgo(iso: string, now: number) {
  const minutes = Math.floor((now - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const KIND_ICON: Record<NotificationKind, { icon: ReactNode; box: string }> = {
  "quote-approved": { icon: <BadgeCheck className="size-5" />, box: "bg-[#ecfdf5] text-[#059669]" },
  deposit: { icon: <DollarSign className="size-5" />, box: "bg-[#ecfdf5] text-[#059669]" },
  payment: { icon: <DollarSign className="size-5" />, box: "bg-[#ecfdf5] text-[#059669]" },
  overdue: { icon: <AlertTriangle className="size-5" />, box: "bg-[#fef2f2] text-[#dc2626]" },
};

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

const panel = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.15 },
};

function NotificationBell({ items, now }: { items: AppNotification[]; now: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [readAll, setReadAll] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const ref = useDismiss(open, () => setOpen(false));

  const list = readAll ? items.map((n) => ({ ...n, unread: false })) : items;
  const unread = list.filter((n) => n.unread).length;

  const markAll = () =>
    startTransition(async () => {
      setError("");
      const res = await markNotificationsRead();
      if (res.error) return setError(res.error);
      setReadAll(true);
      router.refresh();
    });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-[#64748b] transition-colors hover:bg-surface hover:text-navy"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...panel}
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 top-full z-50 mt-2 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_40px_-12px_rgba(8,39,65,0.25)]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-navy">Notifications</h2>
                {unread > 0 && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{unread} Unread</span>
                )}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="rounded-md p-1 text-navy hover:bg-surface">
                <X className="size-5" />
              </button>
            </div>

            {list.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand-light text-brand">
                  <Bell className="size-5" />
                </span>
                <p className="mt-4 text-[15px] font-semibold text-navy">You&apos;re all caught up</p>
                <p className="mt-1 text-[13px] text-muted">
                  Quote approvals, payments, and overdue invoices will show up here.
                </p>
              </div>
            ) : (
              <ul className="max-h-[380px] divide-y divide-line overflow-y-auto">
                {list.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={`flex gap-4 px-5 py-4 transition-colors hover:bg-surface ${n.unread ? "bg-brand-light/60" : ""}`}
                    >
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${KIND_ICON[n.kind].box}`}>
                        {KIND_ICON[n.kind].icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] leading-5 text-[#334155]">
                          <span className="font-bold text-navy">{n.title}</span> {n.body}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-[12px] text-[#94a3b8]">
                          <Clock className="size-3" />
                          {timeAgo(n.at, now)}
                        </span>
                      </span>
                      {n.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {list.length > 0 && (
              <div className="border-t border-line bg-[#f8fafc] px-5 py-4">
                {error && <p className="mb-2 text-center text-[12px] text-[#dc2626]">{error}</p>}
                <button
                  type="button"
                  onClick={markAll}
                  disabled={pending || unread === 0}
                  className="h-10 w-full rounded-lg border border-line bg-white text-[14px] font-semibold text-[#475569] transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Marking…" : "Mark all as read"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const menuItem =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#334155] transition-colors hover:bg-surface hover:text-navy";

function ProfileMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        title={name}
        className="flex size-10 items-center justify-center rounded-full border-2 border-[#14263d] bg-navy text-[14px] font-bold text-white transition-shadow hover:shadow-[0_0_0_3px_rgba(4,129,255,0.25)]"
      >
        {initials(name)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...panel}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-[0_20px_40px_-12px_rgba(8,39,65,0.25)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-[14px] font-bold text-white">
                {initials(name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-bold text-navy">{name}</span>
                {email && <span className="block truncate text-[12px] text-muted">{email}</span>}
              </span>
            </div>
            <div className="flex flex-col py-2" onClick={() => setOpen(false)}>
              <Link href="/settings" role="menuitem" className={menuItem}>
                <Settings className="size-4" /> Account Settings
              </Link>
              <Link href="/partner-program" role="menuitem" className={menuItem}>
                <Handshake className="size-4" /> Partner Program
              </Link>
              <Link href="/support" role="menuitem" className={menuItem}>
                <LifeBuoy className="size-4" /> Help &amp; Support
              </Link>
            </div>
            <form action={signOut} className="border-t border-line pt-2">
              <button type="submit" role="menuitem" className={`${menuItem} text-[#ef4444] hover:bg-[#fef2f2] hover:text-[#dc2626]`}>
                <LogOut className="size-4" /> Log Out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HeaderMenus({
  name,
  email,
  notifications,
  now,
}: {
  name: string;
  email: string;
  notifications: AppNotification[];
  now: number;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3.5">
      <NotificationBell items={notifications} now={now} />
      <ProfileMenu name={name} email={email} />
    </div>
  );
}
