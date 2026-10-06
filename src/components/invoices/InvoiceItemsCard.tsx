"use client";

import { Info, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/customers/ConfirmDialog";
import { AdjustmentInput } from "@/components/jobs/JobItemsCard";
import JobLineItemModal, { type LineDraft } from "@/components/jobs/JobLineItemModal";
import { saveInvoiceAdjustments, saveInvoiceItems } from "@/lib/invoices/actions";
import { balanceOf, type InvoiceDetail } from "@/lib/invoices/data";
import { formatMoney, lineTotal, quoteTotals, type AmountType } from "@/lib/quotes/totals";

const toDraft = (invoice: InvoiceDetail): LineDraft[] =>
  invoice.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: i.unitPrice.toFixed(2), taxable: i.taxable }));

export default function InvoiceItemsCard({ invoice }: { invoice: InvoiceDetail }) {
  const router = useRouter();
  const [lines, setLines] = useState<LineDraft[]>(() => toDraft(invoice));
  const [dirty, setDirty] = useState(false);
  const [adj, setAdj] = useState(() => ({
    discountValue: String(invoice.adjustments.discountValue),
    discountType: invoice.adjustments.discountType,
    taxValue: String(invoice.adjustments.taxValue),
    taxType: invoice.adjustments.taxType,
  }));
  const [lineModal, setLineModal] = useState<{ index: number | null } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const locked = invoice.status === "void";

  const save = (next: LineDraft[]) => {
    if (!next.length) return setError("An invoice needs at least one line item.");
    setLines(next);
    setDirty(false);
    setError(undefined);
    startTransition(async () => {
      const result = await saveInvoiceItems(
        invoice.id,
        next.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxable: l.taxable })),
      );
      if (result.error) {
        setError(result.error);
        setDirty(true);
        return;
      }
      router.refresh();
    });
  };

  const adjustments = (a = adj) => ({
    discountValue: Number(a.discountValue) || 0,
    discountType: a.discountType,
    taxValue: Number(a.taxValue) || 0,
    taxType: a.taxType,
  });

  const saveAdjustments = (next = adj) => {
    const a = adjustments(next);
    const current = invoice.adjustments;
    if (a.discountValue === current.discountValue && a.discountType === current.discountType && a.taxValue === current.taxValue && a.taxType === current.taxType) return;
    setError(undefined);
    startTransition(async () => {
      const result = await saveInvoiceAdjustments(invoice.id, a);
      if (result.error) return setError(result.error);
      router.refresh();
    });
  };

  const setType = (key: "discount" | "tax", t: AmountType) => {
    const next = { ...adj, [`${key}Type`]: t };
    setAdj(next);
    saveAdjustments(next);
  };

  const update = (index: number, patch: Partial<LineDraft>) => {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    setDirty(true);
  };

  const totals = quoteTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxable: l.taxable })),
    { ...adjustments(), depositValue: 0, depositType: "fixed" },
  );
  const balance = balanceOf({ total: totals.total, depositCredit: invoice.depositCredit, amountPaid: invoice.amountPaid });

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed text-left">
            <colgroup>
              {["w-[33.2%]", "w-[11.9%]", "w-[17.9%]", "w-[17.9%]", "w-[9%]", "w-[9.9%]"].map((c, i) => (
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
            <tbody onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && dirty && save(lines)}>
              {lines.map((l, i) => (
                <tr key={i} className="h-[77px]">
                  <td className="pl-[31px] pr-3">
                    <input
                      aria-label={`Line ${i + 1} description`}
                      value={l.description}
                      disabled={locked}
                      onChange={(e) => update(i, { description: e.target.value })}
                      className="h-[35px] w-full rounded-md border border-[#e2e8f0] px-[5px] text-[16px] font-medium text-[#334155] outline-none focus:border-[#00c185] disabled:bg-transparent"
                    />
                  </td>
                  <td className="pl-6">
                    <input
                      aria-label={`Line ${i + 1} quantity`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={l.quantity}
                      disabled={locked}
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
                        disabled={locked}
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
                      disabled={pending || locked}
                      onClick={() => save(lines.map((x, j) => (j === i ? { ...x, taxable: !x.taxable } : x)))}
                      className={`relative inline-flex h-5 w-10 rounded-full transition-colors ${l.taxable ? "bg-[#008080]" : "bg-[#cbd5e1]"}`}
                    >
                      <span className={`absolute top-1 size-3 rounded-full bg-white transition-all ${l.taxable ? "left-6" : "left-1"}`} />
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => setLineModal({ index: i })} disabled={locked} aria-label={`View line ${i + 1}`} className="rounded p-0.5 hover:opacity-70">
                        <Image src="/customers/eye.svg" alt="" width={23} height={23} />
                      </button>
                      <button type="button" onClick={() => setDeleting(i)} disabled={locked} aria-label={`Delete line ${i + 1}`} className="rounded p-0.5 text-[#6b7280] hover:text-[#ef4444] disabled:hover:text-[#6b7280]">
                        <Trash2 className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#f1f5f9] p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2 print:hidden">
            {!locked && (
              <button
                type="button"
                onClick={() => setLineModal({ index: null })}
                className="flex h-[42px] w-[168px] items-center justify-center gap-2 rounded-[5px] bg-[#01c185] text-[14px] text-white transition-colors hover:bg-[#00a873]"
              >
                <span className="text-[18px] leading-none">+</span>
                Create Line Item
              </button>
            )}
            {locked && <p className="text-[13px] text-[#94a3b8]">This invoice is void. Unvoid it to make changes.</p>}
            {pending && <p className="text-[12px] text-[#94a3b8]">Saving…</p>}
            {error && <p role="alert" className="max-w-[380px] text-[12px] text-[#ef4444]">{error}</p>}
          </div>

          <div className="w-full rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:w-[368px]">
            <div className="flex h-8 items-center justify-between text-[16px] leading-6">
              <span className="font-medium text-[#4b5563]">Subtotal</span>
              <span className="font-semibold text-[#111827]">{formatMoney(totals.subtotal)}</span>
            </div>
            {(
              [
                ["Discount", "discount", `-${formatMoney(totals.discount)}`],
                ["Tax Rate", "tax", formatMoney(totals.tax)],
              ] as const
            ).map(([label, key, amount]) => (
              <div key={key} className="mt-3 flex h-8 items-center justify-between gap-2 text-[16px] leading-6">
                <span className="font-medium text-[#4b5563]" title={amount}>{label}</span>
                {locked ? (
                  <span className="font-medium text-[#4b5563]">{amount}</span>
                ) : (
                  <AdjustmentInput
                    label={label}
                    value={adj[`${key}Value`]}
                    type={adj[`${key}Type`]}
                    onValue={(v) => setAdj({ ...adj, [`${key}Value`]: v })}
                    onType={(t) => setType(key, t)}
                    onCommit={() => saveAdjustments()}
                  />
                )}
              </div>
            ))}
            <div className="my-4 h-px bg-[#f3f4f6]" />
            <div className="flex h-10 items-center justify-between">
              <span className="text-[18px] font-bold leading-7 text-[#111827]">Grand Total</span>
              <span className="text-[24px] font-bold leading-8 tracking-[-0.6px] text-[#111827]">{formatMoney(totals.total)}</span>
            </div>
            {invoice.depositCredit > 0 && (
              <div className="mt-3 flex h-8 items-center justify-between rounded-lg border border-[#fee2e2] bg-[#fef2f2] px-3">
                <span className="text-[14px] font-medium leading-5 text-[#b91c1c]">Deposit Paid</span>
                <span className="text-[16px] font-semibold leading-6 text-[#b91c1c]">-{formatMoney(invoice.depositCredit)}</span>
              </div>
            )}
            <div className="mt-3 flex h-9 items-center justify-between">
              <span className="flex items-center gap-1.5 text-[16px] font-medium leading-6 text-[#4b5563]">
                Amount Paid
                <span title="Payments recorded against this invoice. Use Quick Actions → Record Payment to add one.">
                  <Info className="size-2.5 text-[#d1d5db]" strokeWidth={3} />
                </span>
              </span>
              <span className="flex h-9 w-32 items-center gap-2 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[14px] font-medium text-black">
                <span className="text-[#9ca3af]">$</span>
                {invoice.amountPaid.toFixed(2)}
              </span>
            </div>
            <div className="mt-4 flex h-12 items-end justify-between border-t border-[#f3f4f6]">
              <span className="text-[16px] font-bold leading-6 text-[#111827]">Remaining Balance</span>
              <span className="text-[24px] font-extrabold leading-8 tracking-[-1px] text-[#059669]">{formatMoney(balance)}</span>
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
