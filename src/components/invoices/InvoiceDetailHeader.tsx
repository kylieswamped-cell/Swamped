"use client";

import { Archive, ArchiveRestore, Ban, CreditCard, Download, ExternalLink, HandCoins, Mail, RotateCcw, RotateCw, Send, Trash2, Undo2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import ConfirmDialog from "@/components/customers/ConfirmDialog";
import Modal from "@/components/customers/Modal";
import { deleteInvoice, markInvoiceSent, setInvoiceArchived, setInvoiceVoid } from "@/lib/invoices/actions";
import { invoiceStateLabel, type InvoiceDetail } from "@/lib/invoices/data";
import type { JobCustomerOption } from "@/lib/jobs/data";
import InvoiceFormModal, { type InvoiceDefaults } from "./InvoiceFormModal";
import InvoiceSendFlow from "./InvoiceSendFlow";
import RecordPaymentFlow from "./RecordPaymentFlow";

type Dialog = "archive" | "unarchive" | "void" | "delete" | "send" | "payment" | null;

const STRIPE_SOON = "Connect Stripe to take payments online";

/** The Figma "Void Invoice" and "Delete Draft Invoice" confirmations. */
function DangerDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  icon,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  icon: ReactNode;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label={title} busy={busy} className="max-w-[468px]">
      <div className="flex flex-col items-center rounded-3xl border border-[#f3f4f6] bg-white px-8 pb-8 pt-10 text-center shadow-2xl">
        <span className="flex size-16 items-center justify-center rounded-full bg-[#fef2f2]">{icon}</span>
        <h2 className="mt-6 text-[24px] font-bold leading-8 text-[#1e293b]">{title}</h2>
        <p className="mt-3 text-[15px] leading-6 text-[#64748b]">{message}</p>
        {error && <p role="alert" className="mt-4 w-full rounded-lg bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">{error}</p>}
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="mt-8 h-[52px] w-full rounded-xl bg-[#ef4444] text-[16px] font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-60"
        >
          {busy ? "Working…" : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-3 h-[52px] w-full rounded-xl border border-[#e5e7eb] bg-white text-[16px] font-semibold text-[#1e293b] transition-colors hover:bg-[#f8fafc]"
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}

export default function InvoiceDetailHeader({
  invoice,
  customers,
  defaults,
  openSend,
}: {
  invoice: InvoiceDetail;
  customers: JobCustomerOption[];
  defaults: InvoiceDefaults;
  /** Opens the send preview straight away (after "Save & Send"). */
  openSend: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(openSend ? "send" : null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, startTransition] = useTransition();
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Drop ?send=1 so a refresh doesn't reopen the preview.
    if (openSend) router.replace(`/invoices/${invoice.id}`, { scroll: false });
  }, [openSend, invoice.id, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => !menu.current?.contains(e.target as Node) && setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const open = (d: Dialog) => {
    setMenuOpen(false);
    setError(undefined);
    setNotice(undefined);
    setDialog(d);
  };

  const run = (action: () => Promise<{ error?: string }>) => {
    setMenuOpen(false);
    setError(undefined);
    setNotice(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) return setError(result.error);
      router.refresh();
    });
  };

  const confirm = () =>
    startTransition(async () => {
      if (dialog === "delete") {
        const result = await deleteInvoice(invoice.id);
        if (result.error) return setError(result.error);
        setDialog(null);
        router.replace("/invoices");
        return;
      }
      const result =
        dialog === "void" ? await setInvoiceVoid(invoice.id, true) : await setInvoiceArchived(invoice.id, dialog === "archive");
      if (result.error) return setError(result.error);
      setDialog(null);
      router.refresh();
    });

  const downloadPdf = () => {
    setMenuOpen(false);
    // The browser's print dialog saves the page as a PDF.
    window.print();
  };

  const item = (icon: ReactNode, label: string, onClick: () => void, opts: { tone?: string; disabled?: string } = {}) => (
    <button
      key={label}
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={Boolean(opts.disabled)}
      title={opts.disabled}
      className={`flex h-[38px] w-full items-center gap-3 px-4 text-left text-[14px] font-medium leading-5 transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50 ${opts.tone ?? "text-[#334155]"}`}
    >
      <span className="flex w-4 justify-center">{icon}</span>
      {label}
    </button>
  );
  const divider = (key: string) => <div key={key} className="mx-3 my-1 h-px bg-[#f1f5f9]" />;
  const gray = "size-3.5 text-[#64748b]";

  const resend = item(<RotateCw className={gray} />, "Resend Invoice", () => open("send"));
  const collect = item(<CreditCard className="size-3.5 text-[#4f46e5]" />, "Collect Payment", () => {}, { tone: "font-semibold text-[#4f46e5]", disabled: STRIPE_SOON });
  const record = item(<HandCoins className={gray} />, "Record Payment", () => open("payment"));
  // Refunds are recorded against a payment, so this opens the latest one.
  const lastPayment = invoice.payments.at(-1);
  const refund = item(<Undo2 className="size-3.5 text-[#be123c]" />, "Refund Payment", () => lastPayment && router.push(`/payments/${lastPayment.id}`), {
    tone: "font-bold text-[#be123c]",
    disabled: lastPayment ? undefined : "No recorded payments to refund",
  });
  const download = item(<Download className={gray} />, "Download PDF", downloadPdf);
  const stripe = item(<ExternalLink className={gray} />, "View in Stripe", () => {}, { disabled: STRIPE_SOON });
  const voidItem = item(<Ban className="size-3.5 text-[#ea580c]" />, "Void Invoice", () => open("void"), { tone: "text-[#ea580c]" });
  const archive = item(<Archive className={gray} />, "Archive Invoice", () => open("archive"));

  const menuItems: ReactNode[] = {
    draft: [
      item(<Send className="size-3.5 text-[#2563eb]" />, "Send Invoice", () => open("send")),
      item(<Mail className={gray} />, "Mark as Sent", () => run(() => markInvoiceSent(invoice.id))),
      download,
      divider("d1"),
      item(<Trash2 className="size-3.5 text-[#dc2626]" />, "Delete Invoice", () => open("delete"), { tone: "text-[#dc2626]" }),
    ],
    sent: [resend, collect, record, download, stripe, divider("d1"), voidItem],
    overdue: [resend, collect, record, download, stripe, divider("d1"), voidItem],
    partially_paid: [resend, collect, record, refund, download, stripe, divider("d1"), voidItem],
    paid: [download, refund, archive, stripe],
    void: [item(<RotateCcw className={gray} />, "Unvoid Invoice", () => run(() => setInvoiceVoid(invoice.id, false))), download, archive],
    archived: [item(<ArchiveRestore className={gray} />, "Unarchive Invoice", () => open("unarchive")), download],
  }[invoice.state];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex min-w-0 items-center gap-[7px]">
          <Link href="/invoices" aria-label="Back to invoices" className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-[#f1f5f9] sm:-ml-[37px]">
            <Image src="/customers/back.svg" alt="" width={16} height={26} />
          </Link>
          <h2 className="truncate text-[30px] font-bold leading-9 tracking-[-0.75px] text-[#0f172a]">Invoice Details: {invoice.number}</h2>
        </div>

        <div className="flex items-center gap-[7px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={invoice.status === "void"}
            title={invoice.status === "void" ? "Unvoid the invoice to edit it" : undefined}
            className="h-[41px] w-[75px] rounded-lg border border-[#00c185] bg-[#00c185] text-[14px] font-semibold text-white transition-colors hover:bg-[#00a873] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit
          </button>
          <div ref={menu} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={pending}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-[41px] w-[181px] items-center justify-between rounded-lg border border-[#00c185] bg-white pl-[23px] pr-5 text-[14px] font-semibold text-[#00c185] transition-colors hover:bg-[#ecfdf5] disabled:opacity-60"
            >
              {pending ? "Working…" : "Quick Actions"}
              <Image src="/customers/chevron-down.svg" alt="" width={11} height={7} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-30 w-[240px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white py-2 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)]">
                <p className="px-4 pb-2 pt-2 text-[12px] font-semibold leading-4 text-[#334155]">Status: {invoiceStateLabel(invoice.state)}</p>
                {menuItems}
              </div>
            )}
          </div>
        </div>
      </div>

      {(error || notice) && !dialog && (
        <p role="alert" className={`mt-4 rounded-lg border px-3 py-2.5 text-[13px] ${error ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]" : "border-[#fde68a] bg-[#fffbeb] text-[#92400e]"}`}>
          {error ?? notice}
        </p>
      )}

      {editing && (
        <InvoiceFormModal
          invoice={invoice}
          customers={customers}
          defaults={defaults}
          onClose={() => setEditing(false)}
          onSaved={(_, send, message) => {
            setEditing(false);
            setNotice(message);
            router.refresh();
            if (send) setDialog("send");
          }}
        />
      )}

      {dialog === "send" && <InvoiceSendFlow invoiceId={invoice.id} invoiceNumber={invoice.number} onClose={() => setDialog(null)} />}

      {dialog === "payment" && (
        <RecordPaymentFlow
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
          balance={invoice.balance}
          onClose={() => setDialog(null)}
          onSaved={() => router.refresh()}
        />
      )}

      <DangerDialog
        open={dialog === "void"}
        title={`Void Invoice #${invoice.number}?`}
        message="Are you sure you want to void this invoice? The customer will no longer owe this amount."
        confirmLabel="Confirm Void"
        cancelLabel="Cancel and Go Back"
        icon={<Ban className="size-7 text-[#ef4444]" />}
        busy={pending}
        error={error}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
      />
      <DangerDialog
        open={dialog === "delete"}
        title="Delete Draft Invoice?"
        message="Are you sure you want to delete this draft invoice? This action cannot be undone."
        confirmLabel="Confirm Deletion"
        cancelLabel="Cancel"
        icon={<Trash2 className="size-7 text-[#ef4444]" />}
        busy={pending}
        error={error}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
      />
      <ConfirmDialog
        open={dialog === "archive"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Archive Invoice"
        message="Are you sure you want to archive this Invoice?"
        confirmLabel="Confirm Archive"
      />
      <ConfirmDialog
        open={dialog === "unarchive"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Unarchive Invoice"
        message="Are you sure you want to unarchive this Invoice?"
        confirmLabel="Confirm Unarchive"
      />
    </>
  );
}
