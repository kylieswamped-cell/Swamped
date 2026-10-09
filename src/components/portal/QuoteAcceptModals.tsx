"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import Modal from "@/components/customers/Modal";
import { acceptPublicQuote } from "@/lib/portal/actions";
import type { PublicQuote } from "@/lib/portal/quotes";
import { formatMoney } from "@/lib/quotes/totals";

const primaryButton =
  "flex h-[52px] w-full items-center justify-center rounded-lg bg-[#059669] text-[16px] font-semibold leading-6 tracking-[0.2px] text-white shadow-[0_2px_4px_-2px_#a7f3d0,0_4px_6px_-1px_#a7f3d0] transition-colors hover:bg-[#047857] disabled:cursor-wait disabled:opacity-70";
const cancelButton =
  "flex h-12 w-full items-center justify-center rounded-lg bg-white text-[16px] font-medium leading-6 text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:opacity-50";

/** Figma "Approve Quote" (672:711): confirms the customer accepts the quote. */
export function ApproveQuoteModal({
  open,
  token,
  quote,
  depositDue,
  onClose,
  onAccepted,
}: {
  open: boolean;
  token: string;
  quote: PublicQuote;
  /** A deposit still owed; online card payment isn't available yet, so the business collects it. */
  depositDue: number;
  onClose: () => void;
  onAccepted: () => void;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const business = quote.business.name || "The business";

  const close = () => {
    setError(undefined);
    onClose();
  };

  const confirm = () => {
    setError(undefined);
    startTransition(async () => {
      const result = await acceptPublicQuote(token);
      if (result.error) return setError(result.error);
      onAccepted();
    });
  };

  return (
    <Modal open={open} onClose={close} label="Approve Quote" busy={pending} className="max-w-[484px]">
      <div className="relative rounded-2xl border border-[#e2e8f0] bg-white px-8 pb-6 pt-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <button type="button" onClick={close} disabled={pending} aria-label="Close" className="absolute right-8 top-8 rounded p-1 opacity-100 hover:opacity-70">
          <Image src="/portal/close.svg" alt="" width={13} height={13} />
        </button>
        <h2 className="pr-8 text-[24px] font-bold leading-8 text-[#0f172a]">Approve Quote</h2>
        <p className="mt-[17px] text-[15px] leading-[24.38px] text-[#64748b]">
          {depositDue > 0
            ? `You are about to formally accept this quote. A deposit of ${formatMoney(depositDue)} is due before work begins; ${business} will be in touch to collect it.`
            : "You are about to formally accept this quote. No upfront deposit is required at this time. Billing will occur upon completion of service."}
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] px-5 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white">
              <Image src="/portal/check-small.svg" alt="" width={14} height={10} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold leading-5 tracking-[-0.5px] text-[#0f172a]">Quote {quote.number}</span>
              {quote.title && <span className="block truncate text-[12px] leading-4 tracking-[0.1px] text-[#64748b]">{quote.title}</span>}
            </span>
          </div>
          <span className="shrink-0 text-right">
            <span className="block text-[14px] font-bold leading-5 tracking-[0.8px] text-[#0f172a]">{formatMoney(quote.totals.total)}</span>
            <span className="block text-[12px] font-medium leading-4 text-[#059669]">Ready to start</span>
          </span>
        </div>

        {error && <p role="alert" className="mt-4 text-[14px] leading-5 text-[#dc2626]">{error}</p>}

        <div className="mt-8 space-y-2">
          <button type="button" onClick={confirm} disabled={pending} className={primaryButton}>
            {pending ? "Approving…" : "Confirm Acceptance"}
          </button>
          <button type="button" onClick={close} disabled={pending} className={cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Figma "Quote Accepted Successfully!" (674:6). */
export function QuoteAcceptedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const download = () => {
    onClose();
    // The browser's print dialog saves the quote as a PDF.
    setTimeout(() => window.print(), 300);
  };

  return (
    <Modal open={open} onClose={onClose} label="Quote Accepted" className="max-w-[609px]">
      <div className="flex flex-col items-center rounded-3xl bg-white px-6 pb-10 pt-10 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] sm:px-8">
        <span className="flex size-20 items-center justify-center rounded-full bg-[#ecfdf5] shadow-[0_0_0_8px_rgba(236,253,245,0.5)]">
          <Image src="/portal/circle-check.svg" alt="" width={36} height={36} />
        </span>
        <h2 className="mt-6 text-[26px] font-bold leading-9 tracking-[-0.8px] text-[#0f172a] sm:text-[30px]">Quote Accepted Successfully!</h2>
        <p className="mt-3 max-w-[350px] text-[16px] leading-[26px] tracking-[-0.1px] text-[#64748b]">
          Thank you for accepting our quote.
          <br />
          We’ll be in touch soon with the next steps.
        </p>
        <button
          type="button"
          onClick={download}
          className="mt-10 flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-6 text-[16px] font-semibold leading-6 tracking-[0.2px] text-[#334155] shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f8fafc]"
        >
          <Image src="/portal/file-download.svg" alt="" width={12} height={16} />
          Download Quote
        </button>
      </div>
    </Modal>
  );
}
