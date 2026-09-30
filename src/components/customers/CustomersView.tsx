"use client";

import { ArchiveRestore } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { setCustomerArchived } from "@/lib/customers/actions";
import type { CustomerRow, CustomerStatus } from "@/lib/customers/data";
import ConfirmDialog from "./ConfirmDialog";
import CustomerFormModal from "./CustomerFormModal";

const STATUSES: CustomerStatus[] = ["Active", "Pending", "Completed"];

const DATE_RANGES = [
  { value: "", label: "Creation Date" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

const badge: Record<CustomerStatus, string> = {
  Active: "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]",
  Completed: "border-[#d1fae5] bg-[#ecfdf5] text-[#047857]",
  Pending: "border-[#fef3c7] bg-[#fffbeb] text-[#b45309]",
};

const filterClass =
  "h-9 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-[14px] text-[#0f172a] outline-none transition-colors focus:border-[#00c185]";

// Fixed zone so the server render and the browser agree on the date.
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });

export default function CustomersView({
  customers,
  archived,
  now,
  openNew,
}: {
  customers: CustomerRow[];
  archived: boolean;
  now: number;
  openNew: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [range, setRange] = useState("");
  const [adding, setAdding] = useState(openNew);
  const [restoring, setRestoring] = useState<CustomerRow | null>(null);
  const [restoreError, setRestoreError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const since = range ? now - Number(range) * 24 * 60 * 60 * 1000 : null;
    return customers.filter((c) => {
      if (!archived && status && c.status !== status) return false;
      if (since !== null && new Date(c.createdAt).getTime() < since) return false;
      if (!q) return true;
      return [c.name, c.email, c.phone, c.address].some((v) => v?.toLowerCase().includes(q));
    });
  }, [customers, query, status, range, archived, now]);

  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px flex h-[50px] items-center border-b-2 px-6 text-[16px] leading-6 transition-colors ${
        active
          ? "border-[#00c185] font-semibold tracking-[-0.3px] text-[#00c185]"
          : "border-transparent font-medium tracking-[-0.2px] text-[#64748b] hover:text-[#334155]"
      }`}
    >
      {label}
    </Link>
  );

  const unarchive = () =>
    startTransition(async () => {
      const result = await setCustomerArchived(restoring!.id, false);
      if (result.error) return setRestoreError(result.error);
      setRestoring(null);
      router.refresh();
    });

  const filtering = Boolean(query || status || range);
  const cols = archived
    ? ["w-[24%]", "w-[14%]", "w-[21%]", "w-[21%]", "w-[11%]", "w-[9%]"]
    : ["w-[21%]", "w-[13%]", "w-[19%]", "w-[18%]", "w-[11%]", "w-[10%]", "w-[8%]"];

  return (
    <>
      <nav aria-label="Customer lists" className="flex border-b border-[#e2e8f0]">
        {tab("Active Customers", "/customers", !archived)}
        {tab("Archived Customers", "/customers?tab=archived", archived)}
      </nav>

      <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:h-[60px] lg:flex-row lg:items-center lg:gap-4 lg:py-0 lg:pl-3.5 lg:pr-[6px]">
        <label className="relative min-w-0 lg:w-[559px]">
          <span className="sr-only">Search customers</span>
          <Image src="/onboarding/search.svg" alt="" width={17} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone or address..."
            className={`${filterClass} w-full pl-[39px] pr-3 placeholder:text-[#9ca3af]`}
          />
        </label>
        <div className="flex gap-4">
          {!archived && (
            <label className="relative flex-1 lg:w-[122px] lg:flex-none">
              <span className="sr-only">Filter by status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${filterClass} w-full appearance-none pl-3.5 pr-8 ${status ? "" : "text-[#9ca3af]"}`}>
                <option value="">Status</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Image src="/onboarding/dropdown.svg" alt="" width={24} height={24} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
            </label>
          )}
          <label className="relative flex-1 lg:w-[145px] lg:flex-none">
            <span className="sr-only">Filter by creation date</span>
            <select value={range} onChange={(e) => setRange(e.target.value)} className={`${filterClass} w-full appearance-none pl-[7px] pr-8 ${range ? "" : "text-[#9ca3af]"}`}>
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <Image src="/onboarding/chevron-down.svg" alt="" width={12} height={6} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </label>
        </div>
        {!archived && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-12 items-center justify-center gap-4 rounded-lg bg-[#00c185] px-6 text-[16px] font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#00a873] lg:ml-auto lg:w-[176px] lg:px-0"
          >
            <span className="text-[16px] font-black leading-6">+</span>
            Add Customer
          </button>
        )}
      </div>

      <section className="mt-[19px] overflow-hidden rounded-[11px] border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <h2 className="text-[16px] font-bold text-[#1e293b]">
              {filtering ? "No matching customers" : archived ? "No archived customers" : "No customers yet"}
            </h2>
            <p className="mt-1 max-w-[380px] text-[14px] leading-5 text-[#64748b]">
              {filtering
                ? "Try a different search or clear the filters."
                : archived
                  ? "Customers you archive will appear here."
                  : "Add your first customer to start sending quotes and invoices."}
            </p>
            {!filtering && !archived && (
              <button type="button" onClick={() => setAdding(true)} className="mt-5 h-10 rounded-lg bg-[#00c185] px-5 text-[14px] font-semibold text-white hover:bg-[#00a873]">
                + Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-left">
              <colgroup>
                {cols.map((c, i) => (
                  <col key={i} className={c} />
                ))}
              </colgroup>
              <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-[0.57px] text-[#64748b]">
                <tr className="h-[57px] border-b border-[#e2e8f0]">
                  <th className="pl-6">Name</th>
                  <th className="pl-3">Phone</th>
                  <th className="pl-3">Email</th>
                  <th className="pl-3">Address</th>
                  {!archived && <th className="pl-3">Status</th>}
                  <th className="pl-3">Created Date</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[13px] text-[#475569]">
                {filtered.map((c) => (
                  <tr key={c.id} className="h-[69px] border-b border-[#e2e8f0] last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="pl-6 pr-3">
                      <Link href={`/customers/${c.id}`} className="line-clamp-2 text-[15px] font-semibold leading-[18px] text-[#334155] hover:text-[#00c185]">
                        {c.name}
                      </Link>
                    </td>
                    <td className="truncate px-3">{c.phone || "—"}</td>
                    <td className="truncate px-3" title={c.email ?? undefined}>{c.email || "—"}</td>
                    <td className="truncate px-3" title={c.address ?? undefined}>{c.address || "—"}</td>
                    {!archived && (
                      <td className="px-3">
                        <span className={`inline-flex h-[21px] items-center rounded-full border px-2.5 text-[11px] font-medium ${badge[c.status]}`}>
                          {c.status}
                        </span>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3">{shortDate(c.createdAt)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-3">
                        <Link href={`/customers/${c.id}`} aria-label={`View ${c.name}`} className="rounded p-1 transition-opacity hover:opacity-70">
                          <Image src="/customers/eye.svg" alt="" width={22} height={22} />
                        </Link>
                        {archived && (
                          <button
                            type="button"
                            aria-label={`Unarchive ${c.name}`}
                            onClick={() => { setRestoreError(undefined); setRestoring(c); }}
                            className="rounded p-1 text-[#6b7280] transition-colors hover:text-[#00c185]"
                          >
                            <ArchiveRestore className="size-[18px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adding && (
        <CustomerFormModal
          open
          onClose={() => {
            setAdding(false);
            if (openNew) router.replace("/customers", { scroll: false });
          }}
          onSaved={(id) => router.push(`/customers/${id}`)}
        />
      )}

      <ConfirmDialog
        open={restoring !== null}
        onClose={() => setRestoring(null)}
        onConfirm={unarchive}
        busy={pending}
        error={restoreError}
        title="Unarchive Customer"
        message="Are you sure you want to unarchive this Customer?"
        confirmLabel="Confirm Unarchive"
      />
    </>
  );
}
