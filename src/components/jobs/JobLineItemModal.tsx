"use client";

import { Check, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import Modal from "@/components/customers/Modal";
import { formatMoney, lineTotal } from "@/lib/quotes/totals";

export type LineDraft = { description: string; quantity: string; unitPrice: string; taxable: boolean };

const labelClass = "text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]";
const inputClass =
  "mt-2 h-[47px] w-full rounded-xl border border-[#94a3b8] bg-white px-4 text-[14px] font-medium text-[#334155] outline-none transition-colors placeholder:text-[#334155]/20 focus:border-[#00c185]";

function TaxOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[14px] font-medium leading-5 text-[#334155]">
      <input type="radio" name="taxable" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="flex h-3 w-3.5 items-center justify-center rounded-[2.5px] border border-[#767676] bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#00c185]">
        {checked && <Check className="size-2.5 text-[#334155]" strokeWidth={3} />}
      </span>
      {label}
    </label>
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
  const [error, setError] = useState<string>();
  const set = (patch: Partial<LineDraft>) => setLine((l) => ({ ...l, ...patch }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!line.description.trim()) return setError("Enter an item description.");
    if (!(Number(line.quantity) > 0)) return setError("Quantity must be more than 0.");
    if (line.unitPrice === "" || !(Number(line.unitPrice) >= 0)) return setError("Enter a unit price.");
    onSave(line);
  };

  return (
    <Modal open onClose={onClose} label={initial ? "Edit Line item" : "Create New Line item"} className="max-w-[438px]">
      <form noValidate onSubmit={submit} className="overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_0_20px_rgba(0,0,0,0.02),0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <h2 className="flex h-[75px] items-center justify-center border-b border-[#f1f5f9] bg-[#f8fafc]/50 text-[18px] font-semibold leading-7 tracking-[0.2px] text-[#0f172a]">
          {initial ? "Edit Line item" : "Create New Line item"}
        </h2>

        <div className="flex flex-col gap-[22px] px-8 pt-6">
          <label className={labelClass}>
            Item Description
            <input autoFocus value={line.description} onChange={(e) => set({ description: e.target.value })} placeholder="Item Description" className={inputClass} />
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
          {error && (
            <p role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-[15px] px-[15px] pb-6 pt-[34px]">
          <button type="button" onClick={onClose} className="h-10 w-[88px] rounded-lg border border-[#94a3b8] text-[14px] font-semibold text-[#94a3b8] transition-colors hover:bg-[#f8fafc]">
            Cancel
          </button>
          <button type="submit" className="flex h-[39px] w-[150px] items-center justify-center gap-2 rounded-lg bg-[#10b981] text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#059669]">
            <Save className="size-3" />
            Save Product
          </button>
        </div>
      </form>
    </Modal>
  );
}
