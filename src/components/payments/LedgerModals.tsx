"use client";

import { CalendarDays } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition, type ReactNode } from "react";
import Modal from "@/components/customers/Modal";
import type { LedgerInput, PaymentActionResult } from "@/lib/payments/actions";
import { formatMoney } from "@/lib/quotes/totals";

const labelClass = "text-[14px] font-medium leading-5 text-[#3f3f46]";
const fieldClass =
  "w-full rounded-lg border border-[#d4d4d8] bg-white px-4 text-[16px] text-[#18181b] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185] aria-invalid:border-[#ef4444]";
const secondaryButton =
  "h-9 rounded-lg border border-[#d4d4d8] bg-white px-4 text-[14px] font-medium leading-5 text-[#52525b] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#fafafa] disabled:opacity-60";
const primaryButton =
  "h-9 rounded-lg bg-[#02c185] px-4 text-[14px] font-medium leading-5 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#00a873] disabled:opacity-60";

export function todayInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const dayLabel = (v: string) =>
  new Date(`${v}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * The Figma "Record Manual Refund" card, also used to edit a refund or a
 * recorded payment. `onSave` gets the entry and whether to email a receipt.
 */
function LedgerForm({
  title,
  subtitle,
  what,
  methods,
  initial,
  hint,
  fieldErrors,
  error,
  busy,
  allowEmail,
  onCancel,
  onSave,
}: {
  title: string;
  subtitle: string;
  what: "Refund" | "Payment";
  methods: string[];
  initial: LedgerInput;
  hint?: string;
  fieldErrors: Record<string, string>;
  error?: string;
  busy: boolean;
  allowEmail: boolean;
  onCancel: () => void;
  onSave: (input: LedgerInput, emailReceipt: boolean) => void;
}) {
  const [method, setMethod] = useState(methods.includes(initial.method) ? initial.method : methods[0]);
  const [date, setDate] = useState(initial.date);
  const [reference, setReference] = useState(initial.reference);
  const [amount, setAmount] = useState(initial.amount > 0 ? initial.amount.toFixed(2) : "");
  const [note, setNote] = useState(initial.note);
  const dateInput = useRef<HTMLInputElement>(null);

  const save = (email: boolean) => onSave({ method, date, reference, amount: Math.round((Number(amount) || 0) * 100) / 100, note }, email);
  const fieldError = (k: string) => fieldErrors[k] && <p className="mt-1 text-[12px] text-[#ef4444]">{fieldErrors[k]}</p>;

  return (
    <div className="flex max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_25px_50px_-12px_rgba(0,0,0,0.25)]">
      <div className="border-b border-[#f4f4f5] p-6">
        <h2 className="text-[18px] font-semibold leading-7 text-[#18181b]">{title}</h2>
        <p className="text-[14px] leading-5 text-[#71717a]">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto p-6">
        {error && <p role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div className="pt-[2.5px]">
            <label htmlFor="ledger-amount" className={labelClass}>{what} Amount</label>
            <div className="relative mt-[7.5px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#a1a1aa]">$</span>
              <input
                id="ledger-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                aria-invalid={Boolean(fieldErrors.amount)}
                className={`${fieldClass} h-[42px] pl-8`}
              />
            </div>
          </div>
          <div className="pt-[2.5px]">
            <label htmlFor="ledger-method" className={labelClass}>{what} Method</label>
            <div className="relative mt-[7.5px]">
              <select
                id="ledger-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                aria-invalid={Boolean(fieldErrors.method)}
                className={`${fieldClass} h-[42px] appearance-none pr-9`}
              >
                {methods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <Image src="/jobs/select-chevron.svg" alt="" width={11} height={6} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 opacity-70" />
            </div>
          </div>
        </div>
        {(fieldErrors.amount || fieldErrors.method || hint) && (
          <div className="-mt-3">
            {fieldError("amount") || fieldError("method") || <p className="text-[12px] leading-4 text-[#71717a]">{hint}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="pt-[2.5px]">
            <label htmlFor="ledger-date" className={labelClass}>{what} Date</label>
            <div className={`relative mt-[7.5px] flex h-[42px] items-center justify-between rounded-lg border bg-white px-4 ${fieldErrors.date ? "border-[#ef4444]" : "border-[#d4d4d8]"}`}>
              <span className="text-[16px] text-[#18181b]">{date ? dayLabel(date) : "Select"}</span>
              <CalendarDays className="size-4 text-[#a1a1aa]" />
              <input
                ref={dateInput}
                id="ledger-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={() => dateInput.current?.showPicker?.()}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
            {fieldError("date")}
          </div>
          <div className="pt-[2.5px]">
            <label htmlFor="ledger-ref" className={labelClass}>Reference Number</label>
            <input
              id="ledger-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={100}
              placeholder="e.g. CHK-90210 or TRX-ID"
              className={`${fieldClass} mt-[7.5px] h-[42px]`}
            />
          </div>
        </div>

        <div className="pb-1.5 pt-[2.5px]">
          <label htmlFor="ledger-note" className={labelClass}>Internal Notes</label>
          <textarea
            id="ledger-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Add details for internal records..."
            className={`${fieldClass} mt-[7.5px] h-[88px] resize-y py-2`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-[18px] bg-[#fafafa] px-6 py-6">
        <button type="button" onClick={onCancel} disabled={busy} className={secondaryButton}>
          Cancel
        </button>
        <button type="button" onClick={() => save(false)} disabled={busy} className={primaryButton}>
          {busy ? "Saving…" : "Save"}
        </button>
        {allowEmail && (
          <button type="button" onClick={() => save(true)} disabled={busy} className={primaryButton}>
            Save &amp; Email Receipt
          </button>
        )}
      </div>
    </div>
  );
}

/** Edit a recorded payment or refund: the form, saved in place. */
export function EditLedgerModal({
  title,
  subtitle,
  what,
  methods,
  initial,
  hint,
  onClose,
  onSave,
}: {
  title: string;
  subtitle: string;
  what: "Refund" | "Payment";
  methods: string[];
  initial: LedgerInput;
  hint?: string;
  onClose: () => void;
  onSave: (input: LedgerInput) => Promise<PaymentActionResult>;
}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <Modal open onClose={onClose} label={title} busy={pending} className="max-w-[428px]">
      <LedgerForm
        title={title}
        subtitle={subtitle}
        what={what}
        methods={methods}
        initial={initial}
        hint={hint}
        fieldErrors={fieldErrors}
        error={error}
        busy={pending}
        allowEmail={false}
        onCancel={onClose}
        onSave={(input) =>
          startTransition(async () => {
            setError(undefined);
            const result = await onSave(input);
            setFieldErrors(result.fieldErrors ?? {});
            if (result.error) return setError(result.error);
            if (!result.fieldErrors) onClose();
          })
        }
      />
    </Modal>
  );
}

type RefundStep =
  | { kind: "form" }
  | { kind: "confirm"; input: LedgerInput; emailReceipt: boolean }
  | { kind: "done"; input: LedgerInput; number: string; recordedAt: string; notice?: string }
  | { kind: "failed"; input: LedgerInput; emailReceipt: boolean; error: string; code: string };

/** Record Manual Refund → Confirm Payment Entry → recorded, or failed with a retry. */
export function RefundFlow({
  methods,
  available,
  recipient,
  defaultMethod,
  onClose,
  onSaved,
  record,
}: {
  methods: string[];
  /** What can still be refunded on this payment. */
  available: number;
  recipient: string;
  defaultMethod: string;
  onClose: () => void;
  onSaved: () => void;
  record: (input: LedgerInput, emailReceipt: boolean) => Promise<PaymentActionResult & { number?: string; recordedAt?: string }>;
}) {
  const [step, setStep] = useState<RefundStep>({ kind: "form" });
  const [draft, setDraft] = useState<LedgerInput>({ method: defaultMethod, date: todayInput(), reference: "", amount: available, note: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const review = (input: LedgerInput, emailReceipt: boolean) => {
    setDraft(input);
    const errors: Record<string, string> = {};
    if (!input.date) errors.date = "Choose the refund date.";
    if (!(input.amount > 0)) errors.amount = "Enter the amount refunded.";
    else if (input.amount > available) errors.amount = `The refund can't be more than ${formatMoney(available)}.`;
    setFieldErrors(errors);
    if (!Object.keys(errors).length) setStep({ kind: "confirm", input, emailReceipt });
  };

  const save = (input: LedgerInput, emailReceipt: boolean) =>
    startTransition(async () => {
      const result = await record(input, emailReceipt);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        return setStep({ kind: "form" });
      }
      if (result.error) return setStep({ kind: "failed", input, emailReceipt, error: result.error, code: result.code ?? "ERR_REFUND_NOT_SAVED" });
      onSaved();
      setStep({ kind: "done", input, number: result.number ?? "", recordedAt: result.recordedAt ?? new Date().toISOString(), notice: result.notice });
    });

  if (step.kind === "confirm") {
    const rows: [string, ReactNode][] = [
      [
        "Recipient",
        <span key="r" className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#dbeafe] text-[10px] font-bold text-[#2563eb]">{initials(recipient)}</span>
          <span className="max-w-[200px] truncate font-medium text-[#18181b]">{recipient}</span>
        </span>,
      ],
      ["Method", <span key="m" className="font-medium text-[#18181b]">{step.input.method}</span>],
    ];
    return (
      <Modal open onClose={() => setStep({ kind: "form" })} label="Confirm Payment Entry" busy={pending} className="max-w-[428px]">
        <div className="overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_25px_50px_-12px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#f4f4f5] p-6">
            <h2 className="text-[18px] font-semibold leading-7 text-[#18181b]">Confirm Payment Entry</h2>
            <span className="rounded-full border border-[#fef3c7] bg-[#fffbeb] px-2.5 py-0.5 text-[12px] font-semibold leading-4 text-[#b45309]">Manual Entry</span>
          </div>
          <div className="flex flex-col gap-3 p-8">
            <div className="flex gap-4 rounded-xl border border-[#fef3c7] bg-[#fffbeb] p-5">
              <Image src="/payments/warning.svg" alt="" width={18} height={18} className="mt-[3px] size-[18px] shrink-0" />
              <div>
                <p className="text-[14px] font-bold uppercase leading-5 tracking-[-0.35px] text-[#78350f]">Warning</p>
                <p className="mt-[3px] text-[14px] leading-[22.75px] text-[#92400e]">This will immediately update the invoice balance.</p>
              </div>
            </div>
            <dl className="flex flex-col gap-4 py-5">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-[#f4f4f5] py-3 text-[14px] leading-5">
                  <dt className="text-[#71717a]">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 py-3 text-[14px] leading-5">
                <dt className="font-semibold uppercase tracking-[0.7px] text-[#71717a]">Net Impact</dt>
                <dd className="font-bold text-[#dc2626]">-{formatMoney(step.input.amount)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => save(step.input, step.emailReceipt)}
              disabled={pending}
              className="h-11 rounded-lg bg-[#02c185] text-[14px] font-bold leading-5 text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#00a873] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Confirm refund"}
            </button>
            <button type="button" onClick={() => setStep({ kind: "form" })} disabled={pending} className="h-11 rounded-lg text-[14px] font-medium leading-5 text-[#71717a] transition-colors hover:bg-[#fafafa]">
              Go Back
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (step.kind === "done") {
    const when = new Date(step.recordedAt);
    const rows: [string, string][] = [
      ["Refund ID", step.number],
      ["Amount", `${formatMoney(step.input.amount)} USD`],
      ["Timestamp", `${when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • ${when.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`],
    ];
    return (
      <Modal open onClose={onClose} label="Manual Refund Recorded Successfully" className="max-w-[384px]">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e4e4e7] bg-white p-8 text-center shadow-2xl">
          <span className="flex size-16 items-center justify-center rounded-full bg-[#dcfce7]">
            <Image src="/payments/success-check.svg" alt="" width={21} height={24} />
          </span>
          <h2 className="text-[20px] font-bold leading-[25px] text-[#18181b]">Manual Refund Recorded Successfully</h2>
          <dl className="flex w-full flex-col gap-3 rounded-xl bg-[#fafafa] p-4 text-left">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 text-[12px] leading-4">
                <dt className="font-semibold uppercase tracking-[0.6px] text-[#71717a]">{label}</dt>
                <dd className={label === "Amount" ? "font-bold text-[#18181b]" : "text-[#18181b]"}>{value}</dd>
              </div>
            ))}
          </dl>
          {step.notice && <p className="w-full rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-left text-[13px] text-[#92400e]">{step.notice}</p>}
          <button type="button" onClick={onClose} className="h-10 w-full rounded-lg bg-[#02c185] text-[14px] font-medium text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#00a873]">
            Done
          </button>
        </div>
      </Modal>
    );
  }

  if (step.kind === "failed") {
    return (
      <Modal open onClose={onClose} label="Manual Refund Failed" busy={pending} className="max-w-[384px]">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e4e4e7] bg-white p-8 text-center shadow-2xl">
          <span className="flex size-16 items-center justify-center rounded-full bg-[#fee2e2]">
            <Image src="/payments/failure-alert.svg" alt="" width={24} height={24} />
          </span>
          <h2 className="text-[20px] font-bold leading-[25px] text-[#18181b]">Manual Refund Failed</h2>
          <div className="flex w-full flex-col gap-1 rounded-xl border border-[#fee2e2] bg-[#fef2f2] p-4 text-left">
            <p className="text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-[#991b1b]">{step.code}</p>
            <p className="text-[14px] leading-5 text-[#b91c1c]">{step.error}</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3">
            <button type="button" onClick={onClose} disabled={pending} className="h-10 rounded-lg border border-[#d4d4d8] bg-white text-[14px] font-medium text-[#52525b] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#fafafa]">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save(step.input, step.emailReceipt)}
              disabled={pending}
              className="h-[42px] rounded-lg bg-[#dc2626] text-[14px] font-medium text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] hover:bg-[#b91c1c] disabled:opacity-60"
            >
              {pending ? "Retrying…" : "Retry"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} label="Record Manual Refund" className="max-w-[428px]">
      <LedgerForm
        title="Record Manual Refund"
        subtitle="Used for cash, checks, or direct bank transfers."
        what="Refund"
        methods={methods}
        initial={draft}
        hint={`Up to ${formatMoney(available)} can be refunded on this payment.`}
        fieldErrors={fieldErrors}
        busy={pending}
        allowEmail
        onCancel={onClose}
        onSave={review}
      />
    </Modal>
  );
}

/** The Figma "Delete Manual Payment?" / "Delete Manual Refund?" confirmation. */
export function DeleteLedgerDialog({
  open,
  what,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  what: "payment" | "refund";
  busy: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title = what === "payment" ? "Delete Manual Payment?" : "Delete Manual Refund?";
  return (
    <Modal open={open} onClose={onClose} label={title} busy={busy} className="max-w-[600px]">
      <div className="overflow-hidden rounded-xl border border-[#eaeaea] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.1),0_0_1px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col gap-[15px] px-6 pb-12 pt-6">
          <h2 className="text-[20px] font-semibold leading-7 tracking-[-0.5px] text-[#111]">{title}</h2>
          <p className="pb-[9px] text-[15px] leading-[24.38px] text-[#444]">
            Are you sure you want to delete this manual {what}? Deleting a {what} will update the customer balance.
          </p>
          <p className="flex items-start gap-3 rounded-md bg-[#ffebe9] px-4 py-3 text-[14px] leading-[21px] text-[#e3342f]">
            <Image src={what === "payment" ? "/payments/danger.svg" : "/payments/danger-circle.svg"} alt="" width={14} height={14} className="mt-[3px] size-3.5 shrink-0" />
            {error ?? "This action cannot be undone."}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-[#eaeaea] bg-[#fafafa] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-[#eaeaea] bg-white px-4 py-2 text-[14px] font-medium leading-[21px] text-[#444] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#f5f5f5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-[#e53e3e] px-4 py-2 text-[14px] font-medium leading-[21px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#c53030] disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Confirm Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
