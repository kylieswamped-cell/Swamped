"use client";

import { Bold, Check, FileText, Italic, List, ListOrdered, RotateCw, Send, X, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Modal from "@/components/customers/Modal";
import { fileSize } from "@/components/jobs/format";
import { invoiceEmailDraft, sendInvoice } from "@/lib/invoices/actions";

type Draft = { to: string; subject: string; message: string; files: { name: string; sizeBytes: number | null }[] };
type Step = { kind: "preview" } | { kind: "sent"; to: string; dueOn?: string } | { kind: "failed"; error: string; code: string };

const dueDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const darkInput =
  "h-9 w-full rounded-md border border-[#333333] bg-[#2a2a2a] px-3 text-[14px] text-[#e0e0e0] outline-none transition-colors placeholder:text-[#666] focus:border-[#01c185]";

/** Wraps the selected text (or the current line, for lists) in the message box's light formatting. */
function format(el: HTMLTextAreaElement, kind: "bold" | "italic" | "bullet" | "number") {
  const { selectionStart: start, selectionEnd: end, value } = el;
  if (kind === "bold" || kind === "italic") {
    const mark = kind === "bold" ? "**" : "_";
    const picked = value.slice(start, end) || (kind === "bold" ? "bold text" : "italic text");
    return { value: value.slice(0, start) + mark + picked + mark + value.slice(end), cursor: start + mark.length + picked.length + mark.length };
  }
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end) === -1 ? value.length : value.indexOf("\n", end);
  const lines = value.slice(lineStart, lineEnd).split("\n").map((l, i) => (kind === "bullet" ? `- ${l}` : `${i + 1}. ${l}`));
  const block = lines.join("\n");
  return { value: value.slice(0, lineStart) + block + value.slice(lineEnd), cursor: lineStart + block.length };
}

/**
 * Preview Invoice → Send Invoice Now → "Invoice Sent Successfully" or "Failed to Send Invoice".
 * Opens on the preview; the customer's email and a message are filled in.
 */
export default function InvoiceSendFlow({ invoiceId, invoiceNumber, onClose }: { invoiceId: string; invoiceNumber: string; onClose: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [step, setStep] = useState<Step>({ kind: "preview" });
  const [pending, startTransition] = useTransition();
  const body = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let live = true;
    invoiceEmailDraft(invoiceId).then((d) => {
      if (!live) return;
      if (d.error) setLoadError(d.error);
      else setDraft({ to: d.to ?? "", subject: d.subject ?? "", message: d.message ?? "", files: d.files ?? [] });
    });
    return () => {
      live = false;
    };
  }, [invoiceId]);

  const send = () => {
    if (!draft) return;
    startTransition(async () => {
      const result = await sendInvoice(invoiceId, { to: draft.to, subject: draft.subject, message: draft.message });
      router.refresh();
      if (result.ok) setStep({ kind: "sent", to: result.sentTo ?? draft.to, dueOn: result.dueOn });
      else setStep({ kind: "failed", error: result.error ?? "The email wasn't sent.", code: result.code ?? "ERR_UNKNOWN" });
    });
  };

  const applyFormat = (kind: Parameters<typeof format>[1]) => {
    const el = body.current;
    if (!el || !draft) return;
    const next = format(el, kind);
    setDraft({ ...draft, message: next.value });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.cursor, next.cursor);
    });
  };

  if (step.kind === "sent") {
    return (
      <Modal open onClose={onClose} label="Invoice Sent Successfully" className="max-w-[468px]">
        <div className="flex flex-col items-center rounded-3xl border border-[#e2e8f0] bg-white px-10 pb-10 pt-12 text-center shadow-2xl">
          <span className="flex size-20 items-center justify-center rounded-full bg-[#02c185]">
            <Check className="size-9 text-white" strokeWidth={3} />
          </span>
          <h2 className="mt-6 text-[24px] font-bold leading-8 text-[#0a1b33]">Invoice Sent Successfully</h2>
          <p className="mt-2 text-[15px] leading-6 text-[#64748b]">
            Invoice #{invoiceNumber} has been sent to
            <br />
            <span className="break-all font-semibold text-[#0a1b33]">{step.to}</span>
          </p>
          <div className="mt-6 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-5 py-4 text-left">
            <div className="flex items-center justify-between text-[13px] leading-5">
              <span className="text-[#64748b]">Payment Due</span>
              <span className="font-medium text-[#334155]">{step.dueOn ? dueDate(step.dueOn) : "—"}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[13px] leading-5">
              <span className="text-[#64748b]">Payment Status</span>
              <span className="rounded-full border border-[#ffedd5] bg-[#fff7ed] px-2.5 text-[11px] font-bold uppercase leading-[19px] text-[#ea580c]">Awaiting</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="mt-8 h-[52px] w-full rounded-xl bg-[#02c185] text-[16px] font-bold text-white transition-colors hover:bg-[#00a873]">
            Done
          </button>
        </div>
      </Modal>
    );
  }

  if (step.kind === "failed") {
    return (
      <Modal open onClose={onClose} label="Failed to Send Invoice" busy={pending} className="max-w-[468px]">
        <div className="overflow-hidden rounded-[20px] border border-[#e2e8f0] bg-white shadow-2xl">
          <div className="flex flex-col items-center border-b border-[#fee2e2] bg-[#fef2f2] px-8 pb-10 pt-12 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[#fee2e2]">
              <XCircle className="size-8 fill-[#ef4444] text-white" />
            </span>
            <h2 className="mt-6 text-[24px] font-bold leading-8 text-[#0f172a]">Failed to Send Invoice</h2>
            <p className="mt-2 text-[15px] leading-6 text-[#4b5563]">Please check the email and try again.</p>
            <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">{step.error}</p>
          </div>
          <div className="px-8 pb-8">
            {[
              ["Invoice Number", invoiceNumber],
              ["Recipient", draft?.to || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-[#f1f5f9] py-[22px]">
                <span className="text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#64748b]">{label}</span>
                <span className="truncate text-[15px] font-semibold leading-6 text-[#334155]">{value}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setStep({ kind: "preview" })}
              className="mt-8 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#02c185] text-[16px] font-bold text-white transition-colors hover:bg-[#00a873]"
            >
              <RotateCw className="size-3.5" strokeWidth={3} />
              Try Again
            </button>
            <button type="button" onClick={onClose} className="mt-3 h-[52px] w-full rounded-xl border border-[#e2e8f0] bg-white text-[16px] font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc]">
              Cancel
            </button>
            <p className="mt-5 text-center text-[10px] font-medium uppercase leading-[15px] text-[#9ca3af]">Error Code: {step.code}</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} label="Preview Invoice" busy={pending} className="max-w-[568px]">
      <div className="overflow-hidden rounded-xl border border-[#333333] bg-[#1c1c1c] shadow-2xl">
        <div className="flex h-[68px] items-center justify-between border-b border-[#333333] bg-[#1e1e1e] px-6">
          <h2 className="text-[18px] font-semibold leading-7 text-[#e0e0e0]">Preview Invoice</h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="rounded p-1 text-[#888888] hover:text-[#e0e0e0]">
            <X className="size-5" />
          </button>
        </div>

        {!draft ? (
          <p className="px-6 py-16 text-center text-[14px] text-[#888888]">{loadError ?? "Loading…"}</p>
        ) : (
          <div className="flex max-h-[calc(100vh-200px)] flex-col gap-4 overflow-y-auto px-6 py-6">
            <label className="flex items-center gap-4">
              <span className="w-[96px] shrink-0 text-[14px] font-medium uppercase text-[#888888]">To</span>
              <input type="email" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} placeholder="customer@example.com" className={darkInput} />
            </label>
            <label className="flex items-center gap-4">
              <span className="w-[96px] shrink-0 text-[14px] font-medium uppercase text-[#888888]">Subject</span>
              <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} maxLength={200} className={darkInput} />
            </label>

            <div className="mt-2">
              <span className="text-[14px] font-medium uppercase text-[#888888]">Message Body</span>
              <div className="mt-2 overflow-hidden rounded-md border border-[#333333] bg-[#2a2a2a]">
                <div className="flex h-[52px] items-center gap-1 border-b border-[#333333] bg-[#222222] px-2">
                  {(
                    [
                      ["bold", Bold, "Bold"],
                      ["italic", Italic, "Italic"],
                      ["bullet", List, "Bulleted list"],
                      ["number", ListOrdered, "Numbered list"],
                    ] as const
                  ).map(([kind, Icon, label], i) => (
                    <span key={kind} className="flex items-center">
                      {i === 2 && <span className="mx-2 h-4 w-px bg-[#333333]" />}
                      <button type="button" onClick={() => applyFormat(kind)} aria-label={label} title={label} className="flex h-9 w-7 items-center justify-center rounded text-[#aaaaaa] hover:bg-[#333333] hover:text-[#e0e0e0]">
                        <Icon className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <textarea
                  ref={body}
                  aria-label="Message body"
                  value={draft.message}
                  onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                  className="h-[182px] w-full resize-y bg-transparent px-4 py-3 text-[16px] leading-6 text-[#e5e7eb] outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#666666]">The line items, totals, and terms are added below your message.</p>
            </div>

            <div>
              <span className="text-[14px] font-medium uppercase text-[#888888]">Attachments</span>
              <ul className="mt-2 flex flex-col gap-2">
                {draft.files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex h-16 items-center gap-3 rounded-lg border border-[#333333] bg-[#222222] px-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded bg-[#333333]">
                      <FileText className="size-[18px] text-[#f87171]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-[#e0e0e0]">{f.name}</span>
                      <span className="block text-[12px] text-[#888888]">{fileSize(f.sizeBytes) || "File"}</span>
                    </span>
                  </li>
                ))}
                {draft.files.length === 0 && (
                  <li className="rounded-lg border border-dashed border-[#333333] px-3.5 py-4 text-[13px] text-[#888888]">
                    No customer files on this invoice. Add them with Edit to send them along.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="flex h-[72px] items-center justify-end gap-7 border-t border-[#333333] bg-[#1e1e1e] px-6">
          <button type="button" onClick={onClose} disabled={pending} className="text-[14px] font-medium text-[#888888] hover:text-[#e0e0e0]">
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={pending || !draft}
            className="flex h-10 w-[180px] items-center justify-center gap-2 rounded-md bg-[#01c185] text-[14px] font-medium text-white transition-colors hover:bg-[#00a873] disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send Invoice Now"}
            {!pending && <Send className="size-3" />}
          </button>
        </div>
      </div>
    </Modal>
  );
}
