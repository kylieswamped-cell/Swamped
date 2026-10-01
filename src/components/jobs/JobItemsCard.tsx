"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/customers/ConfirmDialog";
import { saveJobItems, setJobAdjustments, type JobAdjustments } from "@/lib/jobs/actions";
import type { JobDetail } from "@/lib/jobs/data";
import { formatMoney, lineTotal, quoteTotals, type AmountType } from "@/lib/quotes/totals";
import JobLineItemModal, { type LineDraft } from "./JobLineItemModal";

const toDraft = (job: JobDetail): LineDraft[] =>
  job.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: i.unitPrice.toFixed(2), taxable: i.taxable }));

const toInput = (lines: LineDraft[]) =>
  lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxable: l.taxable }));

/** Amount input with the Figma $ / % switch beside it. */
function AdjustmentInput({
  label,
  value,
  type,
  onValue,
  onType,
  onCommit,
}: {
  label: string;
  value: string;
  type: AmountType;
  onValue: (v: string) => void;
  onType: (t: AmountType) => void;
  onCommit: () => void;
}) {
  const option = (t: AmountType, text: string) => (
    <button
      type="button"
      aria-pressed={type === t}
      aria-label={`${label} as ${t === "fixed" ? "dollars" : "percent"}`}
      onClick={() => onType(t)}
      className={`h-7 rounded px-2.5 text-[12px] font-semibold leading-4 transition-colors ${
        type === t ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.05)]" : "text-[#6b7280] hover:text-[#111827]"
      }`}
    >
      {text}
    </button>
  );
  return (
    <div className="ml-3 flex h-8 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
      <input
        aria-label={`${label} amount`}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onValue(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="w-16 bg-transparent px-2 text-center text-[14px] font-medium text-[#111827] outline-none"
      />
      <div className="flex items-center border-l border-[#e5e7eb] bg-[#f3f4f6]/50 p-0.5">
        {option("fixed", "$")}
        <span className="mx-px h-4 w-px bg-[#d1d5db]" />
        {option("percent", "%")}
      </div>
    </div>
  );
}

export default function JobItemsCard({ job }: { job: JobDetail }) {
  const router = useRouter();
  const [lines, setLines] = useState<LineDraft[]>(() => toDraft(job));
  const [dirty, setDirty] = useState(false);
  const [lineModal, setLineModal] = useState<{ index: number | null } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [adj, setAdj] = useState({
    discountValue: job.totals.discountValue.toFixed(2),
    discountType: job.totals.discountType,
    taxValue: String(job.totals.taxValue),
    taxType: job.totals.taxType,
  });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const save = (next: LineDraft[]) => {
    setLines(next);
    setDirty(false);
    setError(undefined);
    startTransition(async () => {
      const result = await saveJobItems(job.id, toInput(next));
      if (result.error) {
        setError(result.error);
        setDirty(true);
        return;
      }
      router.refresh();
    });
  };

  const update = (index: number, patch: Partial<LineDraft>) => {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    setDirty(true);
  };

  // Inline edits save when the field loses focus.
  const commitIfDirty = () => dirty && save(lines);

  const saveAdjustments = (next = adj) => {
    setAdj(next);
    setError(undefined);
    const payload: JobAdjustments = {
      discountValue: Number(next.discountValue) || 0,
      discountType: next.discountType,
      taxValue: Number(next.taxValue) || 0,
      taxType: next.taxType,
    };
    startTransition(async () => {
      const result = await setJobAdjustments(job.id, payload);
      if (result.error) return setError(result.error);
      router.refresh();
    });
  };

  // Live preview while editing; the server stores the same math.
  const totals = quoteTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxable: l.taxable })),
    {
      discountValue: Number(adj.discountValue) || 0,
      discountType: adj.discountType,
      taxValue: Number(adj.taxValue) || 0,
      taxType: adj.taxType,
      depositValue: 0,
      depositType: "fixed",
    },
  );

  return (
    <>
      <div className="mt-[25px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed text-left">
            <colgroup>
              {["w-[33.3%]", "w-[12%]", "w-[17.9%]", "w-[17.9%]", "w-[9%]", "w-[9.9%]"].map((c, i) => (
                <col key={i} className={c} />
              ))}
            </colgroup>
            <thead className="bg-[#f8fafc] text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
              <tr className="h-[46px] border-b border-[#e2e8f0]">
                <th className="pl-6">Item Description</th>
                <th className="pl-6">Quantity</th>
                <th className="pr-6 text-right">Unit Price</th>
                <th className="pr-6 text-right">Line Total</th>
                <th className="text-center">Tax</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && commitIfDirty()}>
              {lines.map((l, i) => (
                <tr key={i} className="h-[77px]">
                  <td className="pl-7 pr-3">
                    <input
                      aria-label={`Line ${i + 1} description`}
                      value={l.description}
                      onChange={(e) => update(i, { description: e.target.value })}
                      className="h-[35px] w-full rounded-md border border-[#e2e8f0] px-3 text-[16px] font-medium text-[#334155] outline-none focus:border-[#00c185]"
                    />
                  </td>
                  <td className="pl-12">
                    <input
                      aria-label={`Line ${i + 1} quantity`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={l.quantity}
                      onChange={(e) => update(i, { quantity: e.target.value })}
                      className="h-[34px] w-20 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 text-center text-[16px] text-[#0f172a] outline-none focus:border-[#00c185]"
                    />
                  </td>
                  <td className="pr-[21px]">
                    <div className="flex items-center justify-end gap-[19px]">
                      <span className="text-[16px] text-[#64748b]">$</span>
                      <input
                        aria-label={`Line ${i + 1} unit price`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={l.unitPrice}
                        onChange={(e) => update(i, { unitPrice: e.target.value })}
                        className="h-[34px] w-20 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 text-[16px] text-[#334155] outline-none focus:border-[#00c185]"
                      />
                    </div>
                  </td>
                  <td className="pr-6 text-right text-[16px] font-semibold text-[#334155]">
                    {formatMoney(lineTotal({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }))}
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={l.taxable}
                      aria-label={`Line ${i + 1} taxable`}
                      disabled={pending}
                      onClick={() => save(lines.map((x, j) => (j === i ? { ...x, taxable: !x.taxable } : x)))}
                      className={`relative inline-flex h-5 w-10 rounded-full transition-colors ${l.taxable ? "bg-[#008080]" : "bg-[#cbd5e1]"}`}
                    >
                      <span className={`absolute top-1 size-3 rounded-full bg-white transition-all ${l.taxable ? "left-6" : "left-1"}`} />
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => setLineModal({ index: i })} aria-label={`View line ${i + 1}`} className="rounded p-0.5 hover:opacity-70">
                        <Image src="/customers/eye.svg" alt="" width={23} height={23} />
                      </button>
                      <button type="button" onClick={() => setDeleting(i)} aria-label={`Delete line ${i + 1}`} className="rounded p-0.5 text-[#6b7280] hover:text-[#ef4444]">
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {lines.length === 0 && (
          <p className="px-6 py-10 text-center text-[14px] text-[#94a3b8]">No line items on this job yet.</p>
        )}

        <div className="flex flex-col gap-4 border-t border-[#f1f5f9] p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setLineModal({ index: null })}
              className="flex h-[42px] w-[168px] items-center justify-center gap-2 rounded-[5px] bg-[#01c185] text-[14px] text-white transition-colors hover:bg-[#00a873]"
            >
              <span className="text-[18px] leading-none">+</span>
              Create Line Item
            </button>
            {pending && <p className="text-[12px] text-[#94a3b8]">Saving…</p>}
            {error && <p role="alert" className="max-w-[380px] text-[12px] text-[#ef4444]">{error}</p>}
          </div>

          <div className="w-full rounded-[20px] border border-black/10 bg-white p-6 lg:w-[418px]">
            <div className="flex items-center justify-between text-[14px] leading-5">
              <span className="font-medium text-[#4b5563]">Subtotal</span>
              <span className="font-semibold text-[#111827]">{formatMoney(totals.subtotal)}</span>
            </div>
            <div className="mt-5 flex items-center justify-between text-[14px] leading-5">
              <div className="flex items-center">
                <span className="w-16 font-medium text-[#4b5563]">Discount</span>
                <AdjustmentInput
                  label="Discount"
                  value={adj.discountValue}
                  type={adj.discountType}
                  onValue={(v) => setAdj({ ...adj, discountValue: v })}
                  onType={(t) => saveAdjustments({ ...adj, discountType: t })}
                  onCommit={() => saveAdjustments()}
                />
              </div>
              <span className="font-medium text-[#6b7280]">-{formatMoney(totals.discount)}</span>
            </div>
            <div className="mt-5 flex items-center justify-between text-[14px] leading-5">
              <div className="flex items-center">
                <span className="w-16 font-medium text-[#4b5563]">Tax</span>
                <AdjustmentInput
                  label="Tax"
                  value={adj.taxValue}
                  type={adj.taxType}
                  onValue={(v) => setAdj({ ...adj, taxValue: v })}
                  onType={(t) => saveAdjustments({ ...adj, taxType: t })}
                  onCommit={() => saveAdjustments()}
                />
              </div>
              <span className="font-medium text-[#4b5563]">{formatMoney(totals.tax)}</span>
            </div>
            <div className="my-5 h-px bg-[#f3f4f6]" />
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold leading-6 text-[#111827]">Grand Total</span>
              <span className="text-[18px] font-bold leading-7 text-[#059669]">{formatMoney(totals.total)}</span>
            </div>
            {/* Deposits arrive with payments; until then the whole total is outstanding. */}
            <div className="mt-5 flex items-center justify-between border-t border-[#111827]/20 pt-4">
              <span className="text-[16px] font-bold leading-6 text-[#111827]">Remaining Balance</span>
              <span className="text-[24px] font-extrabold leading-8 text-[#059669]">{formatMoney(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {lineModal && (
        <JobLineItemModal
          initial={lineModal.index !== null ? lines[lineModal.index] : undefined}
          onClose={() => setLineModal(null)}
          onSave={(line) => {
            const index = lineModal.index;
            setLineModal(null);
            save(index !== null ? lines.map((l, i) => (i === index ? line : l)) : [...lines, line]);
          }}
        />
      )}

      <ConfirmDialog
        variant="plain"
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const index = deleting;
          setDeleting(null);
          if (index !== null) save(lines.filter((_, i) => i !== index));
        }}
        title="Delete Line Item?"
        message="Are you sure you want to delete this line item? This action cannot be undone."
        confirmLabel="Delete"
      />
    </>
  );
}
