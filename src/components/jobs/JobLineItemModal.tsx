"use client";

import { BookmarkPlus, Check, Library, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Modal from "@/components/customers/Modal";
import { deleteLibraryItem, listLibraryItems, saveLibraryItem, type LibraryItem } from "@/lib/lineLibrary";
import { joinItem, MAX_LINE_TEXT, splitItem } from "@/lib/lineItems";
import { formatMoney, lineTotal } from "@/lib/quotes/totals";

export type LineDraft = { description: string; quantity: string; unitPrice: string; taxable: boolean };

const labelClass = "text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]";
const inputClass =
  "mt-2 h-[47px] w-full rounded-xl border border-[#94a3b8] bg-white px-4 text-[14px] font-medium text-[#334155] outline-none transition-colors placeholder:text-[#334155]/20 focus:border-brand";

function TaxOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[14px] font-medium leading-5 text-[#334155]">
      <input type="radio" name="taxable" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="flex h-3 w-3.5 items-center justify-center rounded-[2.5px] border border-[#767676] bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
        {checked && <Check className="size-2.5 text-[#334155]" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

/** Search box over the user's saved line items; picking one fills the form. */
function LibraryPicker({ onPick }: { onPick: (item: LibraryItem) => void }) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    listLibraryItems().then((r) => live && setItems(r.items ?? []));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter((i) => !q || i.description.toLowerCase().includes(q));

  const remove = async (id: string) => {
    setItems((list) => (list ?? []).filter((i) => i.id !== id));
    await deleteLibraryItem(id);
  };

  return (
    <div ref={box} className="relative rounded-xl border border-line bg-[#f8fafc] p-3">
      <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
        <Library className="size-3.5" /> Choose from your library
      </span>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && open && (e.stopPropagation(), setOpen(false))}
          placeholder={items === null ? "Loading saved items…" : items.length ? "Search saved line items" : "No saved line items yet"}
          disabled={items !== null && items.length === 0}
          aria-label="Search saved line items"
          className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[14px] text-navy outline-none placeholder:text-[#94a3b8] focus:border-brand disabled:cursor-not-allowed"
        />
      </div>
      {open && items && items.length > 0 && (
        <ul role="listbox" aria-label="Saved line items" className="absolute left-3 right-3 top-full z-20 -mt-1 max-h-60 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-[0_12px_24px_-8px_rgba(8,39,65,0.25)]">
          {shown.length === 0 ? (
            <li className="px-3 py-4 text-center text-[13px] text-[#94a3b8]">No saved items match.</li>
          ) : (
            shown.map((item) => {
              const { name, details } = splitItem(item.description);
              return (
                <li key={item.id} role="option" aria-selected={false} className="group flex items-center gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      onPick(item);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-[#f8fafc]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-navy">{name}</span>
                      {details && <span className="block truncate text-[12px] text-[#94a3b8]">{details}</span>}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-[#475569]">{formatMoney(item.unitPrice)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${name} from your library`}
                    title="Remove from library"
                    className="rounded p-1.5 text-[#cbd5e1] hover:text-[#ef4444]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export default function JobLineItemModal({
  initial,
  onSave,
  onClose,
}: {
  /** Set when editing an existing line. */
  initial?: LineDraft;
  onSave: (line: LineDraft) => void;
  onClose: () => void;
}) {
  const [line, setLine] = useState<LineDraft>(initial ?? { description: "", quantity: "1", unitPrice: "", taxable: true });
  const [name, setName] = useState(() => splitItem(initial?.description ?? "").name);
  const [details, setDetails] = useState(() => splitItem(initial?.description ?? "").details);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<LineDraft>) => setLine((l) => ({ ...l, ...patch }));

  const pick = (item: LibraryItem) => {
    const parts = splitItem(item.description);
    setName(parts.name);
    setDetails(parts.details);
    set({ unitPrice: item.unitPrice.toFixed(2), taxable: item.taxable });
    setError(undefined);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter a line item name.");
    if (!(Number(line.quantity) > 0)) return setError("Quantity must be more than 0.");
    if (line.unitPrice === "" || !(Number(line.unitPrice) >= 0)) return setError("Enter a unit price.");
    const saved = { ...line, description: joinItem(name.trim(), details.trim()) };
    if (!saveToLibrary) return onSave(saved);
    startTransition(async () => {
      const res = await saveLibraryItem({ description: saved.description, unitPrice: Number(saved.unitPrice), taxable: saved.taxable });
      if (res.error) return setError(res.error);
      onSave(saved);
    });
  };

  return (
    <Modal open onClose={onClose} busy={pending} label={initial ? "Edit Line item" : "Create New Line item"} className="max-w-[438px]">
      <form noValidate onSubmit={submit} className="overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_0_20px_rgba(0,0,0,0.02),0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <h2 className="flex h-[75px] items-center justify-center border-b border-[#f1f5f9] bg-[#f8fafc]/50 text-[18px] font-semibold leading-7 tracking-[0.2px] text-navy">
          {initial ? "Edit Line item" : "Create New Line item"}
        </h2>

        <div className="flex flex-col gap-[22px] px-8 pt-6">
          {!initial && <LibraryPicker onPick={pick} />}
          <label className={labelClass}>
            Line Item Name
            <input autoFocus={Boolean(initial)} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="e.g., Water Heater Installation" className={inputClass} />
          </label>
          <label className={labelClass}>
            Line Item Description <span className="font-medium normal-case tracking-normal text-[#94a3b8]">(optional)</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={MAX_LINE_TEXT - 200}
              rows={3}
              placeholder="Details, materials, or scope of work"
              className={`${inputClass} h-auto resize-y py-3 leading-5`}
            />
          </label>
          <label className={labelClass}>
            Quantity
            <input type="number" inputMode="decimal" min={0} step="any" value={line.quantity} onChange={(e) => set({ quantity: e.target.value })} placeholder="Quantity" className={inputClass} />
          </label>
          <label className={labelClass}>
            Unit Price
            <input type="number" inputMode="decimal" min={0} step="0.01" value={line.unitPrice} onChange={(e) => set({ unitPrice: e.target.value })} placeholder="Unit Price" className={inputClass} />
          </label>
          <div className={labelClass}>
            Line Total
            <p className={`${inputClass} flex items-center`}>
              {formatMoney(lineTotal({ quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) }))}
            </p>
          </div>
          <fieldset>
            <legend className="text-[14px] font-medium leading-5 text-[#334155]">Taxable</legend>
            <div className="mt-3 flex gap-[57px] pl-5">
              <TaxOption label="Yes" checked={line.taxable} onChange={() => set({ taxable: true })} />
              <TaxOption label="No" checked={!line.taxable} onChange={() => set({ taxable: false })} />
            </div>
          </fieldset>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 text-[14px] leading-5 text-[#334155] has-[:checked]:border-brand has-[:checked]:bg-brand-light/50">
            <input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#0481ff]" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold text-navy">
                <BookmarkPlus className="size-4 text-brand" /> Save to my line item library
              </span>
              <span className="mt-0.5 block text-[12px] text-[#64748b]">Reuse it on future quotes, jobs, and invoices. Leave unchecked for a one-time item.</span>
            </span>
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-[15px] px-[15px] pb-6 pt-[34px]">
          <button type="button" onClick={onClose} disabled={pending} className="h-10 w-[88px] rounded-lg border border-[#94a3b8] text-[14px] font-semibold text-[#94a3b8] transition-colors hover:bg-[#f8fafc] disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="flex h-[39px] min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark disabled:opacity-60">
            <Save className="size-3" />
            {pending ? "Saving…" : initial ? "Save Line Item" : "Add Line Item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
