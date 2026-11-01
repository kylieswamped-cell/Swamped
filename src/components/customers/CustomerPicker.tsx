"use client";

import { Check, ChevronDown, Mail, MapPin, Phone, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { JobCustomerOption } from "@/lib/jobs/data";
import CustomerFormModal, { type CustomerFormValues } from "./CustomerFormModal";

const formatAddress = (v: CustomerFormValues) =>
  [v.streetAddress, v.city, [v.state, v.zipCode].filter(Boolean).join(" ")].map((p) => p.trim()).filter(Boolean).join(", ") || null;

function Details({ c }: { c: JobCustomerOption }) {
  const rows = [
    { icon: Phone, text: c.phone },
    { icon: Mail, text: c.email },
    { icon: MapPin, text: c.address },
  ].filter((r) => r.text);
  if (!rows.length) return <span className="block text-[12px] text-[#94a3b8]">No contact details</span>;
  return (
    <span className="mt-1 flex flex-col gap-0.5">
      {rows.map(({ icon: Icon, text }) => (
        <span key={text} className="flex min-w-0 items-center gap-1.5 text-[12px] leading-4 text-[#64748b]">
          <Icon className="size-3 shrink-0 text-[#94a3b8]" />
          <span className="truncate">{text}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Customer select for the quote, job, and invoice forms. Each option shows
 * phone, email, and address so similar names can be told apart, and
 * "Create New Customer" opens the regular customer popup without leaving the form.
 */
export default function CustomerPicker({
  id,
  customers,
  value,
  onChange,
  invalid,
  className,
  disabled,
  title,
}: {
  id: string;
  customers: JobCustomerOption[];
  value: string;
  onChange: (customerId: string) => void;
  invalid?: boolean;
  /** Trigger button styles, matching the form's other fields. */
  className: string;
  /** Locked, e.g. when the customer comes from a linked job or quote. */
  disabled?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  // Customers added from here, shown until the page's list refreshes.
  const [added, setAdded] = useState<JobCustomerOption[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const all = useMemo(() => {
    const known = new Set(customers.map((c) => c.id));
    return [...customers, ...added.filter((c) => !known.has(c.id))].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, added]);
  const selected = all.find((c) => c.id === value);

  const q = query.trim().toLowerCase();
  const shown = q
    ? all.filter((c) => [c.name, c.email, c.phone, c.address].some((v) => v?.toLowerCase().includes(q)))
    : all;

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (customerId: string) => {
    onChange(customerId);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={box} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        data-invalid={invalid || undefined}
        className={`${className} flex h-auto min-h-11 data-[invalid=true]:border-[#ef4444] disabled:cursor-not-allowed disabled:opacity-70 items-center justify-between gap-3 py-2 text-left`}
      >
        {selected ? (
          <span className="min-w-0">
            <span className="block truncate font-semibold text-navy">{selected.name}</span>
            {(selected.phone || selected.email) && (
              <span className="block truncate text-[12px] text-[#64748b]">{[selected.phone, selected.email].filter(Boolean).join(" · ")}</span>
            )}
          </span>
        ) : (
          <span className="text-[#9ca3af]">{all.length ? "Select a customer" : "Add your first customer"}</span>
        )}
        <ChevronDown className={`size-4 shrink-0 text-[#64748b] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_32px_-12px_rgba(8,39,65,0.25)]">
          <div className="relative border-b border-line p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setOpen(false))}
              placeholder="Search name, phone, email, or address"
              aria-label="Search customers"
              className="h-9 w-full rounded-lg bg-[#f8fafc] pl-9 pr-3 text-[14px] text-navy outline-none placeholder:text-[#94a3b8] focus:bg-white focus:ring-1 focus:ring-brand"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
            className="flex w-full items-center gap-2 border-b border-line px-4 py-3 text-[14px] font-semibold text-brand transition-colors hover:bg-brand-light"
          >
            <Plus className="size-4" /> Create New Customer
          </button>

          <ul id={listId} role="listbox" aria-label="Customers" className="max-h-72 overflow-y-auto py-1">
            {shown.length === 0 ? (
              <li className="px-4 py-6 text-center text-[13px] text-[#94a3b8]">
                {all.length ? "No customers match your search." : "No customers yet."}
              </li>
            ) : (
              shown.map((c) => (
                <li key={c.id} role="option" aria-selected={c.id === value}>
                  <button
                    type="button"
                    onClick={() => pick(c.id)}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#f8fafc] ${c.id === value ? "bg-brand-light/60" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-navy">{c.name}</span>
                      <Details c={c} />
                    </span>
                    {c.id === value && <Check className="mt-0.5 size-4 shrink-0 text-brand" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <CustomerFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(newId, v) => {
          setAdded((list) => [...list, { id: newId, name: v.name.trim(), email: v.email.trim() || null, phone: v.phone.trim() || null, address: formatAddress(v) }]);
          setCreating(false);
          onChange(newId);
          // Pull the new customer into the page's list as well.
          router.refresh();
        }}
      />
    </div>
  );
}
