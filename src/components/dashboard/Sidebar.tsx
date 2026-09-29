"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth/actions";

// Only the dashboard exists so far; the rest point at "#" until their pages land.
const mainLinks = [
  { label: "Dashboard", href: "/dashboard", icon: "nav-dashboard", w: 16 },
  { label: "Customers", href: "#", icon: "nav-customers", w: 20 },
  { label: "Jobs", href: "#", icon: "nav-jobs", w: 16 },
  { label: "Quotes", href: "#", icon: "nav-quotes", w: 12 },
  { label: "Invoices", href: "#", icon: "nav-invoices", w: 12 },
  { label: "Payments", href: "#", icon: "nav-payments", w: 18 },
];

const footerLinks = [
  { label: "Settings", href: "#", icon: "nav-settings", w: 16 },
  { label: "Support", href: "/contact", icon: "nav-support", w: 16 },
];

function NavLink({ link, active }: { link: (typeof mainLinks)[number]; active: boolean }) {
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-12 items-center gap-2 rounded-lg px-4 text-[16px] transition-colors ${
        active
          ? "bg-[rgba(0,201,167,0.1)] font-medium text-[#00c9a7]"
          : "text-navy-deep hover:bg-surface hover:text-[#00c9a7]"
      }`}
    >
      <span className="flex w-6 shrink-0">
        <Image src={`/onboarding/${link.icon}.svg`} alt="" width={link.w} height={16} />
      </span>
      {link.label}
    </Link>
  );
}

// Onboarding happens on top of the dashboard, so both count as "Dashboard".
const isActive = (href: string, pathname: string) =>
  href === pathname || (href === "/dashboard" && pathname === "/onboarding");

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex h-[104px] shrink-0 items-center gap-2 px-8">
        <Image src="/images/logo.png" alt="Swamped" width={32} height={32} />
        <span className="text-[20px] font-bold tracking-[-0.6px] text-logo">SWAMPED</span>
      </Link>

      <nav className="flex flex-1 flex-col">
        <ul className="flex flex-col gap-1 px-4">
          {mainLinks.map((link) => (
            <li key={link.label}>
              <NavLink link={link} active={isActive(link.href, pathname)} />
            </li>
          ))}
        </ul>
        <ul className="mt-1 border-t border-[#e2e8f0] px-4 pt-1">
          {footerLinks.map((link) => (
            <li key={link.label}>
              <NavLink link={link} active={isActive(link.href, pathname)} />
            </li>
          ))}
        </ul>
      </nav>

      <form action={signOut} className="px-8 py-10">
        <button
          type="submit"
          className="flex items-center gap-3 text-[16px] tracking-[-0.5px] text-[#ef4444] transition-opacity hover:opacity-75"
        >
          <Image src="/onboarding/logout.svg" alt="" width={16} height={16} />
          Log Out
        </button>
      </form>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[#e2e8f0] bg-white lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-5 z-40 rounded-lg p-2 text-navy-deep hover:bg-surface lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-[#0f172a]/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              // Close the drawer once a nav link is followed.
              onClickCapture={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-3 rounded-lg p-2 text-muted hover:bg-surface"
              >
                <X className="size-5" />
              </button>
              <SidebarContent pathname={pathname} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
