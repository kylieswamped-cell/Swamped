"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp, Clock, LayoutDashboard, Link2, LogOut, Megaphone, Menu, Settings, Wallet, X, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOutPartner } from "@/lib/auth/actions";
import type { PartnerStatus } from "@/lib/partners/options";

// Partner portal navigation (Figma 925:328).
const links = [
  { label: "Dashboard", href: "/partner/dashboard", icon: LayoutDashboard },
  { label: "Referral Link", href: "/partner/referral-link", icon: Link2 },
  { label: "Marketing Resources", href: "/partner/resources", icon: Megaphone },
  { label: "Earnings & Payouts", href: "/partner/earnings", icon: Wallet },
  { label: "Settings", href: "/partner/settings", icon: Settings },
  { label: "Support", href: "/partner/support", icon: CircleHelp },
];

function Nav({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/partner/dashboard" className="flex h-[83px] shrink-0 items-center gap-1 px-6">
        <Image src="/images/logo.png" alt="" width={36} height={36} className="mix-blend-multiply" />
        <span className="text-[19px] font-bold text-navy">Swamped</span>
        <span className="ml-1.5 rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[#059669]">Partner</span>
      </Link>
      <nav aria-label="Partner portal" className="mt-4 flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {links.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors ${
                    active ? "bg-[#ecfdf5] font-semibold text-[#059669]" : "text-navy hover:bg-[#f8fafc] hover:text-[#059669]"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <form action={signOutPartner} className="px-6 py-8">
        <button type="submit" className="flex items-center gap-3 text-[15px] text-[#ef4444] transition-opacity hover:opacity-75">
          <LogOut className="size-4" /> Log Out
        </button>
      </form>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "P";

const STATUS_NOTE: Partial<Record<PartnerStatus, { icon: typeof Clock; box: string; text: string }>> = {
  pending: {
    icon: Clock,
    box: "border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af]",
    text: "Your application is being reviewed. You can explore the portal now; your referral link starts tracking sign-ups once you're approved.",
  },
  declined: {
    icon: XCircle,
    box: "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]",
    text: "Your partner application wasn't approved, so your referral link isn't tracking sign-ups. Contact Support if you have questions.",
  },
};

export default function PartnerShell({
  title,
  subtitle,
  name,
  status,
  children,
}: {
  title: string;
  subtitle?: string;
  name: string;
  status: PartnerStatus;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const note = STATUS_NOTE[status];

  return (
    <div className="flex min-h-screen flex-1 bg-[#f8fafc]">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-white lg:block">
        <Nav pathname={pathname} />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-navy/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClickCapture={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
            >
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-6 rounded-lg p-2 text-navy hover:bg-[#f8fafc]">
                <X className="size-5" />
              </button>
              <Nav pathname={pathname} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <header className="flex h-[83px] items-center justify-between gap-4 border-b border-line bg-white pl-16 pr-5 sm:pr-8 lg:pl-8">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="fixed left-4 top-5 z-40 rounded-lg p-2 text-navy hover:bg-[#f8fafc] lg:hidden">
            <Menu className="size-6" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold leading-8 text-navy sm:text-[24px]">{title}</h1>
            {subtitle && <p className="hidden truncate text-[14px] leading-5 text-[#64748b] sm:block">{subtitle}</p>}
          </div>
          <Link
            href="/partner/settings"
            aria-label="Partner settings"
            title={name}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-[14px] font-bold text-white"
          >
            {initials(name)}
          </Link>
        </header>

        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-12 pt-6 sm:px-8 sm:pt-8">
          {note && (
            <p className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[14px] leading-5 ${note.box}`}>
              <note.icon className="mt-0.5 size-4 shrink-0" />
              {note.text}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
