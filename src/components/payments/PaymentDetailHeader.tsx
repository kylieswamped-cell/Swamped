"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { PAYMENT_METHODS } from "@/lib/invoices/data";
import { deletePayment, recordRefund, sendReceipt, updatePayment } from "@/lib/payments/actions";
import { REFUND_METHODS, type PaymentDetail } from "@/lib/payments/data";
import { formatMoney } from "@/lib/quotes/totals";
import { DeleteLedgerDialog, EditLedgerModal, RefundFlow } from "./LedgerModals";

type Dialog = "edit" | "refund" | "delete" | null;

/** The Figma "Manual Payment Actions" menu item. */
export function MenuItem({
  icon,
  label,
  sub,
  tone = "text-[#334155]",
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  sub?: string;
  tone?: string;
  disabled?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={Boolean(disabled)}
      title={disabled}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex w-4 shrink-0 justify-center">
        <Image src={`/payments/${icon}.svg`} alt="" width={icon === "trash" ? 12.25 : 14} height={14} />
      </span>
      <span className="min-w-0">
        <span className={`block text-[14px] leading-5 ${tone.includes("dc2626") ? "font-semibold" : "font-medium"} ${tone}`}>{label}</span>
        {sub && <span className="block text-[10px] leading-4 text-[#94a3b8]">{sub}</span>}
      </span>
    </button>
  );
}

export function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return [open, setOpen, ref] as const;
}

export default function PaymentDetailHeader({
  payment,
  onMessage,
}: {
  payment: PaymentDetail;
  onMessage: (message: { error?: string; notice?: string }) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen, menuRef] = useMenu();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const open = (d: Dialog) => {
    setMenuOpen(false);
    setError(undefined);
    onMessage({});
    setDialog(d);
  };

  const emailReceipt = () => {
    setMenuOpen(false);
    onMessage({});
    startTransition(async () => {
      const result = await sendReceipt(payment.slug);
      onMessage(result.error ? { error: result.error } : { notice: `Receipt sent to ${result.sentTo}.` });
      if (!result.error) router.refresh();
    });
  };

  const download = () => {
    setMenuOpen(false);
    // The browser's print dialog saves the page as a PDF.
    window.print();
  };

  const remove = () =>
    startTransition(async () => {
      const result = await deletePayment(payment.slug);
      if (result.error) return setError(result.error);
      setDialog(null);
      router.replace("/payments");
    });

  const items: ReactNode[] = [
    <MenuItem key="edit" icon="edit" label={`Edit ${payment.kind === "deposit" ? "Deposit" : "Payment"}`} onClick={() => open("edit")} />,
    <MenuItem
      key="refund"
      icon="refund"
      label="Record Refund"
      sub="Manual ledger entry"
      disabled={payment.net <= 0 ? "This payment has been fully refunded" : undefined}
      onClick={() => open("refund")}
    />,
    <MenuItem
      key="send"
      icon="mail"
      label={payment.receiptSentAt ? "Resend Receipt" : "Send Receipt"}
      disabled={payment.customer?.email ? undefined : "The customer has no email address"}
      onClick={emailReceipt}
    />,
    <MenuItem key="pdf" icon="pdf" label="Download Receipt PDF" onClick={download} />,
    <div key="divider" className="my-1.5 border-t border-[#f1f5f9]" />,
    <MenuItem key="delete" icon="trash" label={`Delete ${payment.kind === "deposit" ? "Deposit" : "Payment"}`} tone="text-[#dc2626]" onClick={() => open("delete")} />,
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4e4e7] bg-white px-4 py-4 sm:px-8 print:border-0">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/payments" aria-label="Back to payments" className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-[#f4f4f5] print:hidden">
            <Image src="/payments/back.svg" alt="" width={14} height={16} />
          </Link>
          <h2 className="truncate text-[20px] font-bold leading-7 tracking-[-0.18px] text-[#18181b]">#{payment.number}</h2>
        </div>

        <div className="flex items-center gap-[7px] print:hidden">
          <button
            type="button"
            onClick={() => open("edit")}
            className="h-[41px] w-[75px] rounded-lg border border-[#00c185] bg-[#00c185] text-[14px] font-semibold text-white transition-colors hover:bg-[#00a873]"
          >
            Edit
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={pending}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-[41px] w-[181px] items-center justify-between rounded-lg border border-[#00c185] bg-white pl-[23px] pr-5 text-[14px] font-semibold text-[#00c185] transition-colors hover:bg-[#ecfdf5] disabled:opacity-60"
            >
              {pending ? "Working…" : "Quick Actions"}
              <Image src="/payments/qa-chevron.svg" alt="" width={11.5} height={6.5} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-30 w-64 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white py-1.5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                {items}
              </div>
            )}
          </div>
          <Link href="/payments" aria-label="Close" className="ml-3 flex size-8 items-center justify-center rounded-lg hover:bg-[#f4f4f5]">
            <Image src="/payments/close.svg" alt="" width={13.5} height={18} />
          </Link>
        </div>
      </div>

      {dialog === "edit" && (
        <EditLedgerModal
          title={payment.kind === "deposit" ? "Edit Deposit" : "Edit Payment"}
          subtitle={payment.kind === "deposit" ? `Deposit on Quote #${payment.quote?.number}` : `Payment on Invoice #${payment.invoice?.number}`}
          what="Payment"
          methods={PAYMENT_METHODS}
          initial={{ method: payment.method, date: payment.paidOn, reference: payment.reference ?? "", amount: payment.amount, note: payment.note ?? "" }}
          hint={`Up to ${formatMoney(payment.maxAmount)}${payment.refunded > 0 ? `, and at least ${formatMoney(payment.refunded)} already refunded` : ""}.`}
          onClose={() => setDialog(null)}
          onSave={async (input) => {
            const result = await updatePayment(payment.slug, input);
            if (!result.error && !result.fieldErrors) router.refresh();
            return result;
          }}
        />
      )}

      {dialog === "refund" && (
        <RefundFlow
          methods={REFUND_METHODS}
          available={payment.net}
          recipient={payment.customer?.name ?? "Customer"}
          defaultMethod={REFUND_METHODS.includes(payment.method) ? payment.method : REFUND_METHODS[0]}
          onClose={() => setDialog(null)}
          onSaved={() => router.refresh()}
          record={(input, email) => recordRefund(payment.slug, input, email)}
        />
      )}

      <DeleteLedgerDialog open={dialog === "delete"} what="payment" busy={pending} error={error} onClose={() => setDialog(null)} onConfirm={remove} />
    </>
  );
}
