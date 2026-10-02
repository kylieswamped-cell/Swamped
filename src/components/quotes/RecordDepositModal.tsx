"use client";

import { CalendarDays, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import Modal from "@/components/customers/Modal";
import { recordDeposit } from "@/lib/quotes/actions";
import { DEPOSIT_METHODS } from "@/lib/quotes/data";

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

export default function RecordDepositModal({
  quoteId,
  suggested,
  onClose,
  onSaved,
}: {
  quoteId: string;
  /** Prefills the amount, usually the required deposit. */
  suggested: number;
  onClose: () => void;
  onSaved: (notice?: string) => void;
}) {
  const [method, setMethod] = useState(DEPOSIT_METHODS[0]);
  const [paidOn, setPaidOn] = useState(today);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(suggested > 0 ? suggested.toFixed(2) : "");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const dateInput = useRef<HTMLInputElement>(null);

  const save = (emailReceipt: boolean) => {
    setError(undefined);
    setFieldErrors({});
    startTransition(async () => {
      const result = await recordDeposit(quoteId, { method, paidOn, reference, amount: Number(amount), note }, emailReceipt);
      if (result.fieldErrors) return setFieldErrors(result.fieldErrors);
      if (result.error) return setError(result.error);
      onSaved(result.notice);
    });
  };

  const fieldError = (k: string) => fieldErrors[k] && <p className="mt-1 text-[12px] text-[#ef4444]">{fieldErrors[k]}</p>;

  return (
    <Modal open onClose={onClose} label="Record Deposit Payment" busy={pending} className="max-w-[468px]">
      <div className="relative max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl bg-white px-8 pb-12 pt-8 shadow-2xl">
        <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="absolute right-7 top-8 rounded p-1 text-[#94a3b8] hover:text-[#475569]">
          <X className="size-4" />
        </button>
        <h2 className="text-[20px] font-bold leading-7 text-[#111827]">Record Deposit Payment</h2>
        <p className="mt-1 text-[14px] leading-5 text-[#6b7280]">Record an offline deposit received outside the platform</p>

        <div className="mt-14">
          <label htmlFor="deposit-method" className={labelClass}>Payment Method</label>
          <div className="relative mt-2">
            <select id="deposit-method" value={method} onChange={(e) => setMethod(e.target.value)} aria-invalid={fieldErrors.method ? true : undefined} className={`${fieldClass} h-12 appearance-none pr-10`}>
              {DEPOSIT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <Image src="/jobs/select-chevron.svg" alt="" width={11} height={6} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-70" />
          </div>
          {fieldError("method")}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="deposit-date" className={labelClass}>Payment Date</label>
            <div className={`relative mt-2 flex h-12 items-center justify-between rounded-xl border bg-[#f8fafc] px-4 ${fieldErrors.paidOn ? "border-[#ef4444]" : "border-[#e2e8f0]"}`}>
              <span className="text-[16px] text-[#0f172a]">{paidOn ? shortDate(paidOn) : "Select"}</span>
              <CalendarDays className="size-4 text-[#94a3b8]" />
              <input
                ref={dateInput}
                id="deposit-date"
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
            <label htmlFor="deposit-ref" className={labelClass}>Reference / Check #</label>
            <input id="deposit-ref" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} placeholder="e.g. TXN-9920" className={`${fieldClass} mt-2 h-12`} />
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="deposit-amount" className={labelClass}>Payment Amount</label>
          <div className={`mt-2 flex h-16 items-center gap-2 rounded-xl border bg-[#f8fafc] px-4 focus-within:border-[#00c185] ${fieldErrors.amount ? "border-[#ef4444]" : "border-[#e2e8f0]"}`}>
            <span className="text-[16px] font-medium text-[#94a3b8]">$</span>
            <input
              id="deposit-amount"
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
          {fieldError("amount")}
        </div>

        <div className="mt-6">
          <label htmlFor="deposit-note" className={labelClass}>Internal Note</label>
          <textarea
            id="deposit-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Check #4092 received for Q4 property maintenance deposit."
            className={`${fieldClass} mt-2 h-[84px] resize-y py-3 text-[14px]`}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-[#b91c1c]">
            {error}
          </p>
        )}

        <div className="mt-[46px] flex flex-col gap-3">
          <button type="button" onClick={() => save(true)} disabled={pending} className="h-14 rounded-xl bg-[#02c185] text-[16px] font-semibold text-white transition-colors hover:bg-[#00a873] disabled:opacity-60">
            {pending ? "Saving…" : "Save & Email Receipt"}
          </button>
          <button type="button" onClick={() => save(false)} disabled={pending} className="h-14 rounded-xl bg-[#02c185] text-[16px] font-semibold text-white transition-colors hover:bg-[#00a873] disabled:opacity-60">
            Save Entry
          </button>
          <button type="button" onClick={onClose} disabled={pending} className="h-12 rounded-xl border border-[#e2e8f0] bg-white text-[16px] font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc]">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
