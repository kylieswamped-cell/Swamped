"use client";

import { motion } from "framer-motion";
import { Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { joinItem, MAX_LINE_TEXT } from "@/lib/lineItems";
import { formatMoney, lineTotal } from "@/lib/quotes/totals";

export type NewLineItem = { description: string; quantity: string; unitPrice: string; taxable: boolean };

const labelClass = "text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]";
const fieldClass =
  "mt-2 h-12 w-full rounded-xl border border-[#94a3b8]/60 bg-white px-4 text-[15px] text-navy outline-none placeholder:text-[#cbd5e1] focus:border-brand";

export default function LineItemModal({
  onSave,
  onCancel,
}: {
  onSave: (item: NewLineItem) => void;
  onCancel: () => void;
}) {
  const [item, setItem] = useState<NewLineItem>({ description: "", quantity: "1", unitPrice: "", taxable: true });
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string>();
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const set = (patch: Partial<NewLineItem>) => setItem((i) => ({ ...i, ...patch }));

  // Portal out of the step card: its transform would otherwise trap `fixed`.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-4" onClick={onCancel}>
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-item-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setError("Enter a line item name.");
          if (!(Number(item.quantity) > 0)) return setError("Quantity must be more than 0.");
          if (!(Number(item.unitPrice) >= 0) || item.unitPrice === "") return setError("Enter a unit price.");
          onSave({ ...item, description: joinItem(name.trim(), details.trim()) });
        }}
        className="relative w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-navy"
        >
          <X className="size-5" />
        </button>
        <h2 id="line-item-title" className="border-b border-[#f1f5f9] bg-[#f8fafc] py-6 text-center text-[18px] font-semibold text-navy">
          Create New Line Item
        </h2>
        <div className="flex flex-col gap-5 px-8 py-6">
          <label className={labelClass}>
            Line Item Name
            <input ref={first} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="e.g., Water Heater Installation" className={fieldClass} />
          </label>
          <label className={labelClass}>
            Line Item Description <span className="font-medium normal-case tracking-normal text-[#94a3b8]">(optional)</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={MAX_LINE_TEXT - 200}
              rows={3}
              placeholder="Details, materials, or scope of work"
              className={`${fieldClass} h-auto resize-y py-3 leading-5`}
            />
          </label>
          <label className={labelClass}>
            Quantity
            <input type="number" min={0} step="any" value={item.quantity} onChange={(e) => set({ quantity: e.target.value })} placeholder="Quantity" className={fieldClass} />
          </label>
          <label className={labelClass}>
            Unit Price
            <input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => set({ unitPrice: e.target.value })} placeholder="Unit Price" className={fieldClass} />
          </label>
          <div className={labelClass}>
            Line Total
            <p className={`${fieldClass} flex items-center bg-[#f8fafc] text-[#64748b]`}>
              {formatMoney(lineTotal({ quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }))}
            </p>
          </div>
          <fieldset>
            <legend className="text-[15px] text-navy">Taxable</legend>
            <div className="mt-2 flex gap-8 pl-4 text-[15px] text-navy">
              {[true, false].map((v) => (
                <label key={String(v)} className="flex items-center gap-2">
                  <input type="radio" name="taxable" checked={item.taxable === v} onChange={() => set({ taxable: v })} className="size-4 accent-brand" />
                  {v ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p className="text-[13px] text-[#ef4444]">{error}</p>}
        </div>
        <div className="flex justify-end gap-4 px-6 pb-6">
          <button type="button" onClick={onCancel} className="h-11 rounded-lg border border-[#94a3b8] px-5 text-[15px] font-semibold text-[#94a3b8] hover:text-[#334155]">
            Cancel
          </button>
          <button type="submit" className="flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-[15px] font-medium text-white hover:bg-brand-dark">
            <Save className="size-4" /> Add Line Item
          </button>
        </div>
      </motion.form>
    </div>,
    document.body,
  );
}
