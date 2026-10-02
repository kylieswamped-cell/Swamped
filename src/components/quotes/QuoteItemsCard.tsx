"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/customers/ConfirmDialog";
import JobLineItemModal, { type LineDraft } from "@/components/jobs/JobLineItemModal";
import { saveQuoteItems } from "@/lib/quotes/actions";
import type { QuoteDetail } from "@/lib/quotes/data";
import { formatMoney, lineTotal, quoteTotals } from "@/lib/quotes/totals";

const toDraft = (quote: QuoteDetail): LineDraft[] =>
  quote.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: i.unitPrice.toFixed(2), taxable: i.taxable }));

const pct = (type: string, value: number) => (type === "percent" ? ` (${value}%)` : "");

/** Payment Summary card, shown once a deposit is recorded. */
function PaymentSummary({ deposit }: { deposit: NonNullable<QuoteDetail["depositReceived"]> }) {
  const when = new Date(deposit.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] leading-5 text-[#94a3b8]">{label}</span>
      <span className="truncate text-right text-[13px] font-medium leading-5 text-[#0a192f]">{value}</span>
    </div>
  );
  return (
    <div className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6 lg:w-[288px]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase leading-[17px] text-[#64748b]">Payment Summary</span>
        <span className="rounded-full border border-[#059669]/20 bg-[#ecfdf5] px-3 py-[7px] text-[11px] font-bold leading-[17px] text-[#059669]">Received</span>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {row("Amount", <span className="text-[18px] font-bold leading-[27px]">{formatMoney(deposit.amount)}</span>)}
        {row("Date", when)}
        {row("Method", deposit.method ?? "—")}
        {row("Reference", <span className="font-normal">{deposit.reference ?? "—"}</span>)}
      </div>
    </div>
  );
}

export default function QuoteItemsCard({ quote }: { quote: QuoteDetail }) {
  const router = useRouter();
  const [lines, setLines] = useState<LineDraft[]>(() => toDraft(quote));
  const [dirty, setDirty] = useState(false);
  const [lineModal, setLineModal] = useState<{ index: number | null } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const save = (next: LineDraft[]) => {
    if (!next.length) return setError("A quote needs at least one line item.");
    setLines(next);
    setDirty(false);
    setError(undefined);
    startTransition(async () => {
      const result = await saveQuoteItems(
        quote.id,
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

  const update = (index: number, patch: Partial<LineDraft>) => {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    setDirty(true);
  };

  const a = quote.adjustments;
  const totals = quoteTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxable: l.taxable })),
    a,
  );
  const deposit = quote.depositReceived;

  return (
    <>
      <div className="mt-[17px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
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
            <tbody onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && dirty && save(lines)}>
              {lines.map((l, i) => (
                <tr key={i} className="h-[77px]">
                  <td className="pl-[31px] pr-3">
                    <input
                      aria-label={`Line ${i + 1} description`}
                      value={l.description}
                      onChange={(e) => update(i, { description: e.target.value })}
                      className="h-[27px] w-full rounded-md border border-[#e2e8f0] px-[5px] text-[16px] font-medium text-[#334155] outline-none focus:border-[#00c185]"
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

        <div className="flex flex-col gap-4 border-t border-[#f1f5f9] p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2 print:hidden">
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

          <div className="flex w-full flex-col gap-4 lg:w-auto lg:flex-row lg:items-start">
            {deposit && <PaymentSummary deposit={deposit} />}
            <div className="w-full rounded-3xl border border-[#e2e8f0] bg-white p-8 lg:w-[336px]">
              {[
                ["Subtotal", formatMoney(totals.subtotal), "text-[#0a1b33]"],
                [`Discount${pct(a.discountType, a.discountValue)}`, `-${formatMoney(totals.discount)}`, "text-[#ef4444]"],
                [`Tax${pct(a.taxType, a.taxValue)}`, formatMoney(totals.tax), "text-[#0a1b33]"],
              ].map(([label, value, color], i) => (
                <div key={label} className={`flex items-center justify-between text-[14px] leading-5 ${i ? "mt-4" : ""}`}>
                  <span className="text-[#64748b]">{label}</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
              <div className="mt-[26px] flex items-center justify-between">
                <span className="text-[14px] font-bold leading-5 text-[#0a1b33]">Grand Total</span>
                <span className="text-[24px] font-extrabold leading-8 text-[#0a1b33]">{formatMoney(totals.total)}</span>
              </div>
              {deposit && (
                <div className="mt-4 flex h-8 items-center justify-between rounded-lg border border-[#d6f3ea] bg-[#edf9f5] px-3">
                  <span className="text-[12px] font-medium text-[#059669]">Deposit Received</span>
                  <span className="text-[12px] font-semibold text-[#059669]">{formatMoney(deposit.amount)}</span>
                </div>
              )}
              <div className={`${deposit ? "mt-2.5" : "mt-4"} flex h-[41px] items-center justify-between rounded-lg border border-[#cbd5e1] bg-white/50 px-3`}>
                <span className="text-[11px] leading-[17px] text-[#64748b]">Required Deposit{pct(a.depositType, a.depositValue)}</span>
                <span className="text-[11px] font-bold leading-[17px] text-[#64748b]">{formatMoney(totals.deposit)}</span>
              </div>
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
