"use client";

import { Archive, ArchiveRestore, BriefcaseBusiness, CircleCheck, Copy, CreditCard, Download, FileText, HandCoins, Link2, Mail, RotateCw, Send, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import ConfirmDialog from "@/components/customers/ConfirmDialog";
import type { JobCustomerOption } from "@/lib/jobs/data";
import { createInvoiceFromQuote } from "@/lib/invoices/actions";
import { convertQuoteToJob, deleteQuote, duplicateQuote, setQuoteArchived, setQuoteStatus } from "@/lib/quotes/actions";
import type { QuoteDetail } from "@/lib/quotes/data";
import QuoteFormModal, { type QuoteDefaults } from "./QuoteFormModal";
import QuoteSendFlow from "./QuoteSendFlow";
import RecordDepositModal from "./RecordDepositModal";

type Dialog = "archive" | "unarchive" | "delete" | "send" | "deposit" | null;

const HEADINGS: Record<QuoteDetail["state"], { label: string; color: string }> = {
  draft: { label: "Status: Draft", color: "text-[#9ca3af]" },
  sent: { label: "Status: Sent", color: "text-[#2563eb]" },
  accepted: { label: "Status: Accepted", color: "text-[#00c185]" },
  declined: { label: "Status: Declined", color: "text-[#dc2626]" },
  archived: { label: "Status: Archived", color: "text-[#6b7280]" },
};

export default function QuoteDetailHeader({
  quote,
  customers,
  defaults,
  openSend,
}: {
  quote: QuoteDetail;
  customers: JobCustomerOption[];
  defaults: QuoteDefaults;
  /** Opens the send preview straight away (after "Save & Send to Customer"). */
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
    if (openSend) router.replace(`/quotes/${quote.id}`, { scroll: false });
  }, [openSend, quote.id, router]);

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

  const run = (action: () => Promise<{ error?: string; id?: string; notice?: string }>, after?: (id?: string) => void) => {
    setMenuOpen(false);
    setError(undefined);
    setNotice(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) return setError(result.error);
      if (result.notice) setNotice(result.notice);
      if (after) after(result.id);
      else router.refresh();
    });
  };

  const confirm = () =>
    startTransition(async () => {
      if (dialog === "delete") {
        const result = await deleteQuote(quote.id);
        if (result.error) return setError(result.error);
        setDialog(null);
        router.replace("/quotes");
        return;
      }
      const result = await setQuoteArchived(quote.id, dialog === "archive");
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
      className={`flex h-[41px] w-full items-center gap-[18px] px-4 text-left text-[14px] leading-[21px] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50 ${opts.tone ?? "text-[#0a192f]"}`}
    >
      <span className="flex w-4 justify-center">{icon}</span>
      {label}
    </button>
  );
  const divider = (key: string) => <div key={key} className="mx-[9px] my-1 h-px bg-[#f3f4f6]" />;
  const gray = "size-3.5 text-[#6b7280]";

  const copyLink = item(<Link2 className={gray} />, "Copy Customer Link", () => {
    setMenuOpen(false);
    setError(undefined);
    navigator.clipboard
      .writeText(`${window.location.origin}/q/${quote.publicToken}`)
      .then(() => setNotice("Customer link copied. Anyone with it can view and approve this quote."))
      .catch(() => setError("Couldn't copy the link. Please try again."));
  });
  const duplicate = item(<Copy className={gray} />, "Duplicate Quote", () => run(() => duplicateQuote(quote.id), (id) => id && router.push(`/quotes/${id}`)));
  const download = item(<Download className={gray} />, "Download PDF", downloadPdf);
  const archive = item(<Archive className={gray} />, "Archive Quote", () => open("archive"), { tone: "text-[#6b7280]" });
  const remove = item(<Trash2 className="size-3.5 text-[#dc2626]" />, "Delete Quote", () => open("delete"), { tone: "text-[#dc2626]" });

  const menuItems: ReactNode[] =
    quote.state === "archived"
      ? [item(<ArchiveRestore className={gray} />, "Unarchive Quote", () => open("unarchive")), download, divider("d1"), remove]
      : quote.state === "draft"
        ? [
            item(<Send className="size-3.5 text-[#2563eb]" />, "Send Quote", () => open("send")),
            item(<Mail className={gray} />, "Mark as Sent", () => run(() => setQuoteStatus(quote.id, "sent"))),
            divider("d1"),
            duplicate,
            download,
            divider("d2"),
            archive,
            remove,
          ]
        : quote.state === "accepted"
          ? [
              copyLink,
              duplicate,
              download,
              divider("d1"),
              quote.job
                ? item(<BriefcaseBusiness className={gray} />, `View Job ${quote.job.number}`, () => router.push(`/jobs/${quote.job!.id}`))
                : item(<BriefcaseBusiness className={gray} />, "Convert to Job", () => run(() => convertQuoteToJob(quote.id), (id) => id && router.push(`/jobs/${id}`))),
              item(<FileText className={gray} />, "Convert to Invoice", () => run(() => createInvoiceFromQuote(quote.id), (id) => id && router.push(`/invoices/${id}`))),
              ...(quote.depositReceived ? [] : [item(<HandCoins className={gray} />, "Record Deposit", () => open("deposit"))]),
              divider("d2"),
              archive,
            ]
          : [
              item(<RotateCw className="size-3.5 text-[#2563eb]" />, "Resend Quote", () => open("send")),
              copyLink,
              item(<CreditCard className="size-3.5 text-[#00c185]" />, "Collect Deposit", () => {}, { disabled: "Connect Stripe to collect deposits online" }),
              item(<HandCoins className={gray} />, "Record Deposit", () => open("deposit")),
              item(<CircleCheck className={gray} />, "Manually Approve", () => run(() => setQuoteStatus(quote.id, "accepted"))),
              divider("d1"),
              duplicate,
              download,
              divider("d2"),
              archive,
              remove,
            ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex min-w-0 items-center gap-[7px]">
          <Link href="/quotes" aria-label="Back to quotes" className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-[#f1f5f9] sm:-ml-[37px]">
            <Image src="/customers/back.svg" alt="" width={16} height={26} />
          </Link>
          <h2 className="truncate text-[30px] font-bold leading-9 text-[#0f172a]">Quote Details: #{quote.number}</h2>
        </div>

        <div className="flex items-center gap-[7px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-[41px] w-[75px] rounded-lg border border-[#00c185] bg-[#00c185] text-[14px] font-semibold text-white transition-colors hover:bg-[#00a873]"
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
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-30 w-[240px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white pb-2 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)]">
                <p className={`px-3 pb-3 pt-5 text-[10px] font-bold uppercase leading-[15px] ${HEADINGS[quote.state].color}`}>{HEADINGS[quote.state].label}</p>
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
        <QuoteFormModal
          quote={quote}
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

      {dialog === "send" && <QuoteSendFlow quoteId={quote.id} quoteNumber={quote.number} onClose={() => setDialog(null)} />}

      {dialog === "deposit" && (
        <RecordDepositModal
          quoteId={quote.id}
          suggested={quote.totals.deposit || quote.totals.total}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            setNotice(message);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={dialog === "archive"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Archive Quote"
        message="Are you sure you want to archive this Quote?"
        confirmLabel="Confirm Archive"
      />
      <ConfirmDialog
        open={dialog === "unarchive"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Unarchive Quote"
        message="Are you sure you want to unarchive this Quote?"
        confirmLabel="Confirm Unarchive"
      />
      <ConfirmDialog
        variant="plain"
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Delete Quote?"
        message="Are you sure you want to delete this Quote? This action cannot be undone."
        confirmLabel="Delete"
      />
    </>
  );
}
