"use client";

import { Check, Library, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import Modal from "@/components/customers/Modal";
import { deleteLibraryItem, saveLibraryItem, type LibraryItem } from "@/lib/lineLibrary";
import { joinItem, MAX_LINE_TEXT, splitItem } from "@/lib/lineItems";
import { formatMoney } from "@/lib/quotes/totals";
import { SettingsCard, StatusLine, type Status } from "./ui";

const labelClass = "text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]";
const inputClass =
  "mt-2 h-[47px] w-full rounded-xl border border-[#94a3b8] bg-white px-4 text-[14px] font-medium text-[#334155] outline-none transition-colors placeholder:text-[#334155]/20 focus:border-brand";
const panelClass =
  "overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_0_20px_rgba(0,0,0,0.02),0_25px_50px_-12px_rgba(0,0,0,0.25)]";
const cancelClass =
  "h-10 w-[88px] rounded-lg border border-[#94a3b8] text-[14px] font-semibold text-[#94a3b8] transition-colors hover:bg-[#f8fafc] disabled:opacity-60";

function TaxOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[14px] font-medium leading-5 text-[#334155]">
      <input type="radio" name="library-taxable" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="flex h-3 w-3.5 items-center justify-center rounded-[2.5px] border border-[#767676] bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
        {checked && <Check className="size-2.5 text-[#334155]" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

/** Create or edit one saved line item. */
function ItemModal({ item, onSaved, onClose }: { item?: LibraryItem; onSaved: (item: LibraryItem) => void; onClose: () => void }) {
  const parts = splitItem(item?.description ?? "");
  const [name, setName] = useState(parts.name);
  const [details, setDetails] = useState(parts.details);
  const [unitPrice, setUnitPrice] = useState(item ? item.unitPrice.toFixed(2) : "");
  const [taxable, setTaxable] = useState(item?.taxable ?? true);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const title = item ? "Edit Saved Line Item" : "New Saved Line Item";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter a line item name.");
    if (unitPrice === "" || !(Number(unitPrice) >= 0)) return setError("Enter a unit price.");
    startTransition(async () => {
      const res = await saveLibraryItem({
        id: item?.id,
        description: joinItem(name.trim(), details.trim()),
        unitPrice: Number(unitPrice),
        taxable,
      });
      if (res.error || !res.item) return setError(res.error ?? "Couldn't save the line item.");
      onSaved(res.item);
    });
  };

  return (
    <Modal open onClose={onClose} busy={pending} label={title} className="max-w-[438px]">
      <form noValidate onSubmit={submit} className={panelClass}>
        <h2 className="flex h-[75px] items-center justify-center border-b border-[#f1f5f9] bg-[#f8fafc]/50 text-[18px] font-semibold leading-7 tracking-[0.2px] text-navy">
          {title}
        </h2>
        <div className="flex flex-col gap-[22px] px-8 pt-6">
          <label className={labelClass}>
            Line Item Name
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="e.g., Water Heater Installation" className={inputClass} />
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
            Unit Price
            <input type="number" inputMode="decimal" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="Unit Price" className={inputClass} />
          </label>
          <fieldset>
            <legend className="text-[14px] font-medium leading-5 text-[#334155]">Taxable</legend>
            <div className="mt-3 flex gap-[57px] pl-5">
              <TaxOption label="Yes" checked={taxable} onChange={() => setTaxable(true)} />
              <TaxOption label="No" checked={!taxable} onChange={() => setTaxable(false)} />
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-[15px] px-[15px] pb-6 pt-[34px]">
          <button type="button" onClick={onClose} disabled={pending} className={cancelClass}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className="flex h-[39px] min-w-[150px] items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark disabled:opacity-60">
            <Save className="size-3" />
            {pending ? "Saving…" : item ? "Save Changes" : "Add to Library"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ item, onDeleted, onClose }: { item: LibraryItem; onDeleted: () => void; onClose: () => void }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const name = splitItem(item.description).name;

  const confirm = () =>
    startTransition(async () => {
      const res = await deleteLibraryItem(item.id);
      if (res.error) return setError(res.error);
      onDeleted();
    });

  return (
    <Modal open onClose={onClose} busy={pending} label="Delete saved line item" className="max-w-[420px]">
      <div className={`${panelClass} px-8 pb-6 pt-8 text-center`}>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fef2f2] text-[#ef4444]">
          <Trash2 className="size-5" />
        </span>
        <h2 className="mt-4 text-[18px] font-semibold leading-7 text-navy">Delete saved line item?</h2>
        <p className="mt-2 text-[14px] leading-5 text-[#64748b]">
          <span className="font-semibold text-navy">{name}</span> will be removed from your library. Quotes, jobs, and invoices that already use it
          won&apos;t change.
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-[15px]">
          <button type="button" onClick={onClose} disabled={pending} className={cancelClass}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={pending} className="h-10 min-w-[120px] rounded-lg bg-[#ef4444] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-60">
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Central place to view, add, edit, and delete the user's saved line items. */
export function LineItemLibraryCard({ initial, loadError }: { initial: LibraryItem[]; loadError?: string }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<LibraryItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<LibraryItem | null>(null);
  const [status, setStatus] = useState<Status>(loadError ? { error: loadError } : null);

  const q = query.trim().toLowerCase();
  const shown = items.filter((i) => !q || i.description.toLowerCase().includes(q));

  const saved = (item: LibraryItem) => {
    const isNew = !items.some((i) => i.id === item.id);
    setItems((list) => (isNew ? [item, ...list] : list.map((i) => (i.id === item.id ? item : i))));
    setStatus({ notice: isNew ? "Line item added to your library." : "Line item updated." });
    setEditing(null);
  };

  return (
    <SettingsCard
      id="line-items"
      title="Line Item Library"
      subtitle="Saved line items you can reuse on quotes, jobs, and invoices."
      aside={
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex h-[41px] items-center gap-2 rounded-[12px] bg-brand px-5 text-[14px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          <Plus className="size-4" strokeWidth={2.5} /> New Line Item
        </button>
      }
    >
      {items.length > 0 && (
        <div className="relative mb-4 max-w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved line items"
            aria-label="Search saved line items"
            className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[14px] text-navy outline-none placeholder:text-[#94a3b8] focus:border-brand"
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-[16px] border border-dashed border-line px-6 py-10 text-center">
          <Library className="size-8 text-[#94a3b8]" />
          <p className="mt-3 text-[16px] font-semibold text-navy">No saved line items yet</p>
          <p className="mt-1 max-w-[380px] text-[14px] leading-5 text-[#64748b]">
            Add services and materials you use often, then pick them when creating a quote, job, or invoice.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-[16px] border border-line px-6 py-8 text-center text-[14px] text-[#94a3b8]">No saved line items match your search.</p>
      ) : (
        <ul className="divide-y divide-[#f1f5f9] rounded-[16px] border border-line" aria-label="Saved line items">
          {shown.map((item) => {
            const { name, details } = splitItem(item.description);
            return (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[15px] font-semibold leading-5 text-navy">{name}</p>
                  {details && <p className="mt-1 line-clamp-2 whitespace-pre-line break-words text-[13px] leading-5 text-[#64748b]">{details}</p>}
                </div>
                <div className="flex items-center gap-4 sm:shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.4px] ${
                      item.taxable ? "bg-brand-light text-[#059669]" : "bg-[#f1f5f9] text-[#64748b]"
                    }`}
                  >
                    {item.taxable ? "Taxable" : "Non-taxable"}
                  </span>
                  <span className="w-24 text-right text-[15px] font-semibold text-[#334155]">{formatMoney(item.unitPrice)}</span>
                  <div className="ml-auto flex items-center gap-1 sm:ml-0">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      aria-label={`Edit ${name}`}
                      title="Edit"
                      className="rounded-lg p-2 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-navy"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(item)}
                      aria-label={`Delete ${name}`}
                      title="Delete"
                      className="rounded-lg p-2 text-[#64748b] transition-colors hover:bg-[#fef2f2] hover:text-[#ef4444]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <StatusLine status={status} className="mt-4" />

      {editing && <ItemModal item={editing === "new" ? undefined : editing} onSaved={saved} onClose={() => setEditing(null)} />}
      {deleting && (
        <DeleteModal
          item={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setItems((list) => list.filter((i) => i.id !== deleting.id));
            setStatus({ notice: "Line item deleted." });
            setDeleting(null);
          }}
        />
      )}
    </SettingsCard>
  );
}
