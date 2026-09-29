"use client";

import { CalendarDays, ChevronDown, Lock, Plus, Trash2, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { createFirstQuote } from "@/lib/onboarding/actions";
import { formatMoney, lineTotal, quoteTotals, type AmountType } from "@/lib/quotes/totals";
import type { CustomerOption } from "./CustomerStep";
import { AmountInput, FormError, inputClass } from "./fields";
import FileDrop from "./FileDrop";
import LineItemModal, { type NewLineItem } from "./LineItemModal";
import StepModal from "./StepModal";
import { uploadAttachment } from "./uploadAttachment";
import { useStepSubmit } from "./useStepSubmit";

export type QuoteDefaults = {
  quoteNumber: string;
  quoteDate: string;
  expiresOn: string;
  terms: string;
  taxRate: string;
  depositValue: string;
  depositType: AmountType;
};

type Line = NewLineItem & { key: string };

let lineKey = 0;
const nextKey = () => `line-${++lineKey}`;
const emptyLine = (): Line => ({ key: nextKey(), description: "", quantity: "1", unitPrice: "", taxable: true });

const smallLabel = "text-[13px] font-semibold text-[#334155]";
const cellInput =
  "h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-2 text-[14px] text-[#0f172a] outline-none focus:border-[#00c9a7]";

function Section({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-t border-[#e2e8f0] pt-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 text-[15px] font-bold uppercase tracking-[0.4px] text-[#0f172a]"
      >
        <ChevronDown className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        {icon}
        {title}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function ReadOnly({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <p className={smallLabel}>{label}</p>
      <p className={`${inputClass} mt-2 flex items-center gap-2 text-[14px] text-[#475569]`}>
        {icon}
        {value}
      </p>
    </div>
  );
}

export default function QuoteStep({
  customers,
  defaults: d,
  onDone,
}: {
  customers: CustomerOption[];
  defaults: QuoteDefaults;
  onDone: (note?: string) => void;
}) {
  const { pending, error, fieldErrors: fe, run } = useStepSubmit();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [adding, setAdding] = useState(false);
  const [discount, setDiscount] = useState({ value: "0", type: "fixed" as AmountType });
  const [tax, setTax] = useState({ value: d.taxRate, type: "percent" as AmountType });
  const [deposit, setDeposit] = useState({ value: d.depositValue, type: d.depositType });
  const [message, setMessage] = useState("");
  const [terms, setTerms] = useState(d.terms);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const selected = customers.find((c) => c.id === customerId);
  const numericLines = lines.map((l) => ({
    description: l.description,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    taxable: l.taxable,
  }));
  const totals = quoteTotals(numericLines, {
    discountValue: Number(discount.value),
    discountType: discount.type,
    taxValue: Number(tax.value),
    taxType: tax.type,
    depositValue: Number(deposit.value),
    depositType: deposit.type,
  });

  const update = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = () =>
    run(
      async () => {
        let attachmentPath: string | null = null;
        if (file) {
          try {
            attachmentPath = await uploadAttachment(file, "quotes");
          } catch (err) {
            return { error: (err as Error).message };
          }
        }
        return createFirstQuote({
          customerId,
          title,
          items: numericLines.filter((l) => l.description.trim()),
          discountValue: Number(discount.value),
          discountType: discount.type,
          taxValue: Number(tax.value),
          taxType: tax.type,
          depositValue: Number(deposit.value),
          depositType: deposit.type,
          customerMessage: message,
          terms,
          internalNotes: notes,
          attachmentPath,
        });
      },
      (result) => onDone(result.emailSent ? undefined : result.emailNote),
    );

  return (
    <StepModal
      label="Step 4 of 4"
      title="Create Your First Quote"
      width="max-w-[1100px]"
      description={
        <>
          <p>Ready to send a real quote? Create your first quote and send it to a customer.</p>
          <p>Just exploring? Send yourself a test quote and see exactly what your customers will experience.</p>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="customerId" className={smallLabel}>
              Select Customer
            </label>
            <div className="relative mt-2">
              <select
                id="customerId"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                aria-invalid={fe.customerId ? true : undefined}
                className={`${inputClass} appearance-none pr-10 text-[14px]`}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#64748b]" />
            </div>
            {fe.customerId ? (
              <p className="mt-2 text-[12px] text-[#ef4444]">{fe.customerId}</p>
            ) : (
              selected && (
                <p className="mt-2 text-[12px] text-[#94a3b8]">
                  {selected.email ? `Will be emailed to ${selected.email}` : "This customer has no email — the quote will be saved but not sent."}
                </p>
              )
            )}
          </div>
          <div>
            <label htmlFor="title" className={smallLabel}>
              Job Title / Specification
            </label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Comprehensive Site Assessment and Repair" className={`${inputClass} mt-2 text-[14px]`} />
          </div>
        </div>

        <div className="grid items-end gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1.4fr_auto]">
          <ReadOnly label="Quote Number" value={d.quoteNumber} />
          <ReadOnly label="Quote Date" value={d.quoteDate} icon={<CalendarDays className="size-4 text-[#94a3b8]" />} />
          <ReadOnly label="Quote Expiration" value={d.expiresOn} icon={<CalendarDays className="size-4 text-[#94a3b8]" />} />
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-12 items-center justify-center gap-1.5 rounded-lg bg-[#10b981] px-4 text-[14px] font-medium text-white hover:bg-[#059669]"
          >
            <Plus className="size-4" /> Create New Line Item
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
              <tr>
                <th className="px-4 py-3">Item Description</th>
                <th className="w-24 px-2 py-3 text-center">Quantity</th>
                <th className="w-36 px-2 py-3">Unit Price</th>
                <th className="w-32 px-2 py-3 text-right">Line Total</th>
                <th className="w-20 px-2 py-3 text-center">Tax</th>
                <th className="w-16 px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.key} className="border-t border-[#f1f5f9]">
                  <td className="px-4 py-3">
                    <input aria-label={`Item ${i + 1} description`} value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} placeholder="e.g., Interior Painting - Master Bedroom" className={cellInput} />
                  </td>
                  <td className="px-2 py-3">
                    <input aria-label={`Item ${i + 1} quantity`} type="number" min={0} step="any" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} className={`${cellInput} text-center`} />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2 text-[14px] text-[#64748b]">
                      $
                      <input aria-label={`Item ${i + 1} unit price`} type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} placeholder="0.00" className={cellInput} />
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right text-[14px] font-bold text-[#0f172a]">
                    {formatMoney(lineTotal({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }))}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={l.taxable}
                      aria-label={`Item ${i + 1} taxable`}
                      onClick={() => update(l.key, { taxable: !l.taxable })}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${l.taxable ? "bg-[#0f766e]" : "bg-[#cbd5e1]"}`}
                    >
                      <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${l.taxable ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      aria-label={`Remove item ${i + 1}`}
                      disabled={lines.length === 1}
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      className="text-[#475569] hover:text-[#ef4444] disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, emptyLine()])}
            className="flex w-full items-center gap-1.5 border-t border-[#f1f5f9] px-4 py-3 text-[13px] font-semibold text-[#00c9a7] hover:bg-[#f8fafc]"
          >
            <Plus className="size-4" /> Add row
          </button>
        </div>
        {fe.items && <p className="-mt-3 text-[12px] text-[#ef4444]">{fe.items}</p>}

        <div className="ml-auto w-full max-w-[420px] rounded-2xl border border-[#e2e8f0] p-6 text-[15px] text-[#475569]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-[#0f172a]">{formatMoney(totals.subtotal)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <label htmlFor="discount" className="w-24">Discount</label>
            <AmountInput name="discount" value={discount.value} type={discount.type} onValue={(value) => setDiscount({ ...discount, value })} onType={(type) => setDiscount({ ...discount, type })} className="h-10 w-36" />
            <span className="ml-auto">-{formatMoney(totals.discount)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <label htmlFor="tax" className="w-24">Tax</label>
            <AmountInput name="tax" value={tax.value} type={tax.type} onValue={(value) => setTax({ ...tax, value })} onType={(type) => setTax({ ...tax, type })} className="h-10 w-36" />
            <span className="ml-auto">{formatMoney(totals.tax)}</span>
          </div>
          <div className="mt-5 flex justify-between border-t border-[#e2e8f0] pt-5">
            <span className="font-bold text-[#0f172a]">Grand Total</span>
            <span className="text-[20px] font-bold text-[#059669]">{formatMoney(totals.total)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <label htmlFor="deposit" className="w-24 leading-5">Required Deposit</label>
            <AmountInput name="deposit" value={deposit.value} type={deposit.type} onValue={(value) => setDeposit({ ...deposit, value })} onType={(type) => setDeposit({ ...deposit, type })} className="h-10 w-36" />
            <span className="ml-auto font-semibold text-[#0f172a]">{formatMoney(totals.deposit)}</span>
          </div>
        </div>

        <Section title="Customer-Facing Information" icon={<span className="flex size-7 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]"><User className="size-3.5" /></span>}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="message" className={smallLabel}>Customer Message</label>
              <textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter a message that the customer will see on the final quote document..." className={`${inputClass} mt-2 h-auto resize-y py-3 text-[14px]`} />
            </div>
            <div>
              <p className={smallLabel}>Customer Attachments</p>
              <div className="mt-2">
                <FileDrop id="quoteFile" file={file} onFile={setFile} />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Terms and Conditions">
          <textarea aria-label="Terms and conditions" rows={5} value={terms} onChange={(e) => setTerms(e.target.value)} className={`${inputClass} h-auto resize-y py-3 text-[12px] leading-5 text-[#475569]`} />
        </Section>

        <Section title="Internal-Only Information" icon={<span className="flex size-7 items-center justify-center rounded-full bg-[#fff7ed] text-[#ea580c]"><Lock className="size-3.5" /></span>}>
          <div className="md:w-1/2">
            <label htmlFor="notes" className={smallLabel}>Internal Notes</label>
            <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add private notes for your team only. These will not be visible to the customer..." className={`${inputClass} mt-2 h-auto resize-y py-3 text-[14px]`} />
          </div>
        </Section>

        <FormError message={error} />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-lg bg-[#00c9a7] px-6 text-[14px] font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,201,167,0.2)] transition-colors hover:bg-[#00b394] disabled:opacity-60"
          >
            {pending ? "Saving…" : selected?.email ? "Save & Send to Customer" : "Save Quote"}
          </button>
        </div>
      </form>

      {adding && (
        <LineItemModal
          onCancel={() => setAdding(false)}
          onSave={(item) => {
            // Replace the starter row if it's still blank.
            setLines((ls) => {
              const rest = ls.filter((l) => l.description.trim() || l.unitPrice);
              return [...rest, { ...item, key: nextKey() }];
            });
            setAdding(false);
          }}
        />
      )}
    </StepModal>
  );
}
