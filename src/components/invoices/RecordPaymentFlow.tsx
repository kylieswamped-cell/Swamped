"use client";

import { CalendarDays, Check, CircleAlert, HandCoins, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition, type ReactNode } from "react";
import Modal from "@/components/customers/Modal";
import { recordInvoicePayment, type PaymentInput } from "@/lib/invoices/actions";
import { PAYMENT_METHODS } from "@/lib/invoices/data";
import { formatMoney } from "@/lib/quotes/totals";

const labelClass = "text-[14px] font-semibold leading-5 text-[#334155]";
const fieldClass =
  "w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-[16px] text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185] focus:bg-white aria-invalid:border-[#ef4444]";

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const shortDate = (v: string) =>
  new Date(`${v}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

type Step =
  | { kind: "form" }
  | { kind: "confirm"; emailReceipt: boolean }
  | { kind: "done"; balance: number; notice?: string }
  | { kind: "failed"; error: string; code: string; emailReceipt: boolean };

/**
 * Record Manual Payment → "Confirm Manual Payment Entry?" → recorded, or "Recording Failed".
 */
export default function RecordPaymentFlow({
  invoiceId,
  invoiceNumber,
  balance,
  onClose,
  onSaved,
}: {
  invoiceId: string;
  invoiceNumber: string;
  /** What's still owed; prefills the amount. */
  balance: number;
  onClose: () => void;
  /** Called once the payment is saved, so the page can refresh behind the success popup. */
  onSaved: () => void;
}) {
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [paidOn, setPaidOn] = useState(today);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(balance > 0 ? balance.toFixed(2) : "");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const dateInput = useRef<HTMLInputElement>(null);

  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const after = Math.max(0, Math.round((balance - value) * 100) / 100);

  const review = (emailReceipt: boolean) => {
    const errors: Record<string, string> = {};
    if (!paidOn) errors.paidOn = "Choose the payment date.";
    if (!(value > 0)) errors.amount = "Enter the amount received.";
    else if (value > balance) errors.amount = `The payment can't be more than the balance (${formatMoney(balance)}).`;
    setFieldErrors(errors);
    if (!Object.keys(errors).length) setStep({ kind: "confirm", emailReceipt });
  };

  const save = (emailReceipt: boolean) =>
    startTransition(async () => {
      const input: PaymentInput = { method, paidOn, reference, amount: value, note };
      const result = await recordInvoicePayment(invoiceId, input, emailReceipt);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        return setStep({ kind: "form" });
      }
      if (result.error) return setStep({ kind: "failed", error: result.error, code: result.code ?? "ERR_PAYMENT_NOT_SAVED", emailReceipt });
      onSaved();
      setStep({ kind: "done", balance: result.balance ?? after, notice: result.notice });
    });

  const fieldError = (k: string) => fieldErrors[k] && <p className="mt-1 text-[12px] text-[#ef4444]">{fieldErrors[k]}</p>;

  if (step.kind === "confirm") {
    return (
      <Modal open onClose={() => setStep({ kind: "form" })} label="Confirm Manual Payment Entry?" busy={pending} className="max-w-[444px]">
        <div className="overflow-hidden rounded-[22px] border border-[#f1f5f9] bg-white shadow-2xl">
          <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[#f0f9ff]">
              <HandCoins className="size-7 text-[#0284c7]" />
            </span>
            <h2 className="mt-6 text-[24px] font-bold leading-8 text-[#0f172a]">Confirm Manual Payment Entry?</h2>
            <p className="mt-3 text-[15px] leading-6 text-[#64748b]">
              Are you sure you want to record this manual payment? This action will instantly adjust the remaining invoice balance and update the customer records.
            </p>
            <dl className="mt-6 w-full rounded-2xl border border-[#f1f5f9] bg-[#f8fafc] px-6 py-5 text-left">
              {[
                ["Method", <span key="m" className="text-[16px] font-semibold text-[#0f172a]">{method}</span>],
                ["Reference Code", <span key="r" className="text-[16px] font-medium text-[#0f172a]">{reference.trim() || "—"}</span>],
                ["Total Collected", <span key="t" className="text-[20px] font-bold text-[#0284c7]">{formatMoney(value)}</span>],
              ].map(([label, content], i) => (
                <div key={label as string} className={`flex items-center justify-between gap-4 ${i ? "mt-4" : ""}`}>
                  <dt className="text-[14px] font-medium text-[#94a3b8]">{label}</dt>
                  <dd className="truncate">{content}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => save(step.emailReceipt)}
              disabled={pending}
              className="mt-8 h-14 w-full rounded-xl bg-[#02c185] text-[16px] font-bold text-white transition-colors hover:bg-[#00a873] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Confirm Payment"}
            </button>
            <button type="button" onClick={() => setStep({ kind: "form" })} disabled={pending} className="mt-2 h-14 w-full rounded-xl text-[16px] font-semibold text-[#64748b] transition-colors hover:bg-[#f8fafc]">
              Go Back
            </button>
          </div>
          <div className="h-1.5 bg-[#f1f5f9]" />
        </div>
      </Modal>
    );
  }

  if (step.kind === "done") {
    const rows: [string, ReactNode][] = [
      ["Amount Received", <span key="a" className="font-extrabold text-[#0a1b33]">{formatMoney(value)}</span>],
      ["Payment Method", method],
      ["Reference", reference.trim() || "—"],
      ["Invoice", `#${invoiceNumber}`],
      [
        "Remaining Balance",
        step.balance > 0 ? (
          formatMoney(step.balance)
        ) : (
          <span key="b" className="rounded bg-[#d1fae5] px-2 py-0.5 text-[10px] font-bold uppercase text-[#047857]">Paid in Full</span>
        ),
      ],
    ];
    return (
      <Modal open onClose={onClose} label="Manual Payment Recorded Successfully!" className="max-w-[468px]">
        <div className="flex flex-col items-center rounded-3xl border border-[#f3f4f6] bg-white px-8 pb-8 pt-10 text-center shadow-2xl">
          <span className="flex size-16 items-center justify-center rounded-full bg-[#dcfce7]">
            <Check className="size-8 text-[#16a34a]" strokeWidth={3} />
          </span>
          <h2 className="mt-6 text-[24px] font-extrabold leading-8 text-[#0a1b33]">Manual Payment Recorded Successfully!</h2>
          <div className="mt-6 w-full rounded-2xl border border-[#f3f4f6] bg-[#f9fafb] px-6 py-5 text-left">
            {rows.map(([label, content], i) => (
              <div key={label} className={`flex items-center justify-between gap-4 text-[14px] leading-5 ${i ? "mt-3" : ""}`}>
                <span className="text-[#6b7280]">{label}</span>
                <span className="truncate font-bold text-[#1e293b]">{content}</span>
              </div>
            ))}
            <p className="mt-5 border-t border-[#e2e8f0] pt-4 text-[13px] leading-5 text-[#64748b]">
              <span className="font-semibold text-[#0a1b33]">Invoice updated successfully.</span> Associated records have been updated automatically.
            </p>
          </div>
          {step.notice && <p className="mt-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[13px] text-[#92400e]">{step.notice}</p>}
          <button type="button" onClick={onClose} className="mt-8 h-[52px] w-full rounded-xl bg-[#00c185] text-[16px] font-semibold text-white transition-colors hover:bg-[#00a873]">
            Return to Invoice
          </button>
        </div>
      </Modal>
    );
  }

  if (step.kind === "failed") {
    return (
      <Modal open onClose={onClose} label="Recording Failed" busy={pending} className="max-w-[440px]">
        <div className="flex flex-col items-center rounded-2xl border border-[#f1f5f9] bg-white px-8 pb-8 pt-10 text-center shadow-2xl">
          <span className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-[#fef2f2] shadow-sm">
            <span className="flex size-12 items-center justify-center rounded-full bg-[#ef4444]">
              <CircleAlert className="size-6 text-white" strokeWidth={2.5} />
            </span>
          </span>
          <h2 className="mt-6 text-[24px] font-bold leading-8 text-[#0f172a]">Recording Failed</h2>
          <p className="mt-2 text-[15px] leading-6 text-[#64748b]">{step.error}</p>
          <div className="mt-6 w-full rounded-xl border border-[#f1f5f9] bg-[#f8fafc] px-5 py-4 text-left">
            <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.6px] text-[#94a3b8]">Log Reference</p>
            <p className="mt-1 font-mono text-[12px] leading-4 text-[#475569]">{step.code}</p>
          </div>
          <button
            type="button"
            onClick={() => save(step.emailReceipt)}
            disabled={pending}
            className="mt-8 h-[52px] w-full rounded-xl bg-[#dc2626] text-[16px] font-semibold text-white transition-colors hover:bg-[#b91c1c] disabled:opacity-60"
          >
            {pending ? "Retrying…" : "Retry Payment"}
          </button>
          <button
            type="button"
            onClick={() => setStep({ kind: "form" })}
            disabled={pending}
            className="mt-3 h-[52px] w-full rounded-xl border border-[#e2e8f0] bg-white text-[16px] font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc]"
          >
            Use a Different Payment Method
          </button>
          <button type="button" onClick={onClose} disabled={pending} className="mt-3 h-10 text-[16px] font-medium text-[#64748b] hover:text-[#334155]">
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} label="Record Manual Payment" className="max-w-[468px]">
      <div className="max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="relative border-b border-[#f1f5f9] px-8 pb-6 pt-8">
          <h2 className="text-[20px] font-bold leading-7 text-[#0f172a]">Record Manual Payment</h2>
          <p className="mt-1 text-[14px] font-medium leading-5 text-[#4f46e5]">Invoice #{invoiceNumber}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-7 top-8 rounded p-1 text-[#94a3b8] hover:text-[#475569]">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-8 pb-8 pt-6">
          <label htmlFor="payment-method" className={labelClass}>Payment Method</label>
          <div className="relative mt-2">
            <select id="payment-method" value={method} onChange={(e) => setMethod(e.target.value)} className={`${fieldClass} h-12 appearance-none pr-10`}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <Image src="/jobs/select-chevron.svg" alt="" width={11} height={6} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-70" />
          </div>
          {fieldError("method")}

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="payment-date" className={labelClass}>Payment Date</label>
              <div className={`relative mt-2 flex h-12 items-center justify-between rounded-xl border bg-[#f8fafc] px-4 ${fieldErrors.paidOn ? "border-[#ef4444]" : "border-[#e2e8f0]"}`}>
                <span className="text-[16px] text-[#0f172a]">{paidOn ? shortDate(paidOn) : "Select"}</span>
                <CalendarDays className="size-4 text-[#94a3b8]" />
                <input
                  ref={dateInput}
                  id="payment-date"
                  type="date"
                  value={paidOn}
                  onChange={(e) => setPaidOn(e.target.value)}
                  onClick={() => dateInput.current?.showPicker?.()}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
              {fieldError("paidOn")}
            </div>
            <div>
              <label htmlFor="payment-ref" className={labelClass}>Reference / Check #</label>
              <input id="payment-ref" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} placeholder="e.g. TXN-9920" className={`${fieldClass} mt-2 h-12`} />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="payment-amount" className={labelClass}>Amount Received</label>
            <div className={`mt-2 flex h-16 items-center gap-2 rounded-xl border bg-[#f8fafc] px-4 focus-within:border-[#00c185] ${fieldErrors.amount ? "border-[#ef4444]" : "border-[#e2e8f0]"}`}>
              <span className="text-[16px] font-medium text-[#94a3b8]">$</span>
              <input
                id="payment-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent text-[24px] font-bold text-[#0f172a] outline-none placeholder:text-[#cbd5e1]"
              />
              <span className="rounded bg-[#eef2ff] px-2 py-[3px] text-[12px] font-bold text-[#4f46e5]">USD</span>
            </div>
            {fieldError("amount") || <p className="mt-1.5 text-[11px] leading-4 text-[#64748b]">Balance remaining after this payment: {formatMoney(after)}</p>}
          </div>

          <div className="mt-6">
            <label htmlFor="payment-note" className={labelClass}>
              Internal Note <span className="font-normal text-[#94a3b8]">(Optional)</span>
            </label>
            <textarea
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a private note for your records..."
              className={`${fieldClass} mt-2 h-16 resize-y py-3 text-[14px]`}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button type="button" onClick={() => review(true)} className="h-14 rounded-xl bg-[#02c185] text-[16px] font-semibold text-white transition-colors hover:bg-[#00a873]">
              Save &amp; Email Receipt
            </button>
            <button type="button" onClick={() => review(false)} className="h-14 rounded-xl bg-[#02c185] text-[16px] font-semibold text-white transition-colors hover:bg-[#00a873]">
              Save Entry
            </button>
            <button type="button" onClick={onClose} className="h-12 rounded-xl border border-[#e2e8f0] bg-white text-[16px] font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc]">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
