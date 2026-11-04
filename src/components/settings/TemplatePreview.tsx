"use client";

import { Eye, Info, TriangleAlert } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import Modal from "@/components/customers/Modal";
import { formatMessage } from "@/lib/email/format";
import {
  MERGE_FIELD_HELP,
  MERGE_FIELDS,
  fillTemplate,
  sampleMergeValues,
  templateFieldKeys,
  type EmailTemplate,
  type MergeValues,
  type TemplateKey,
} from "@/lib/settings/templates";

type PreviewProfile = { businessName: string; contactName: string; email: string };

const ProfileContext = createContext<PreviewProfile>({ businessName: "", contactName: "", email: "" });

/** Gives every template editor the business details used in previews. */
export function PreviewProfileProvider({ profile, children }: { profile: PreviewProfile; children: ReactNode }) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

// Wrapped around filled-in values so the preview can highlight them. Neither
// character survives HTML escaping changes, and nobody types them.
const OPEN = "\u0001";
const CLOSE = "\u0002";

/** What follows the message in each email, so the preview doesn't overpromise. */
const AFTER_MESSAGE: Record<TemplateKey, string> = {
  quote: "The quote's line items, totals, and a View Quote button appear below your message.",
  deposit: "A deposit receipt with the amount and date appears below your message.",
  invoice: "The invoice's line items, totals, due date, and a View Invoice button appear below your message.",
  invoice_receipt: "A payment receipt with the amount and date appears below your message.",
  invoice_reminder: "A View Invoice button appears below your message.",
  past_due_notice: "A View Invoice button appears below your message.",
  past_due_reminder: "A View Invoice button appears below your message.",
  refund: "A refund receipt with the amounts appears below your message.",
};

function Highlighted({ text, highlight }: { text: string; highlight: boolean }) {
  const parts = text.split(new RegExp(`${OPEN}|${CLOSE}`));
  // Odd parts sit between OPEN and CLOSE.
  return (
    <>
      {parts.map((p, i) =>
        i % 2 && highlight ? (
          <mark key={i} className="rounded bg-[#dbeafe] px-0.5 text-inherit">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}

function PreviewModal({ templateKey, title, value, onClose }: { templateKey: TemplateKey; title: string; value: EmailTemplate; onClose: () => void }) {
  const profile = useContext(ProfileContext);
  const [highlight, setHighlight] = useState(true);
  const sample = sampleMergeValues(profile);
  const keys = templateFieldKeys(templateKey);

  // Only the fields this email fills in when it's actually sent.
  const values: MergeValues = Object.fromEntries(keys.map((k) => [k, `${OPEN}${sample[k]}${CLOSE}`]));
  const subject = fillTemplate(value.subject, values);
  const body = fillTemplate(value.body, values);

  const unresolved = [...new Set([...`${subject}\n${body}`.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) => m[0]))];
  const bodyHtml = formatMessage(body)
    .replaceAll(OPEN, highlight ? '<mark style="background:#dbeafe;border-radius:4px;padding:0 2px;color:inherit">' : "")
    .replaceAll(CLOSE, highlight ? "</mark>" : "");

  return (
    <Modal open onClose={onClose} label={`${title} preview`} className="max-w-[680px]">
      <div className="overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_0_20px_rgba(0,0,0,0.02),0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <div className="border-b border-[#f1f5f9] bg-[#f8fafc]/50 px-6 py-5 pr-14">
          <h2 className="text-[18px] font-semibold leading-7 text-navy">Email Preview</h2>
          <p className="mt-0.5 text-[13px] leading-5 text-[#64748b]">
            {title} with example values. Business Name and Sender Name use your saved Business Profile.
          </p>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-6 py-5">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-[13px] text-[#475569]">
            <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} className="size-4 accent-[#0481ff]" />
            Highlight filled-in merge fields
          </label>

          {unresolved.length > 0 && (
            <p role="alert" className="flex gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[13px] leading-5 text-[#92400e]">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {unresolved.join(", ")} {unresolved.length === 1 ? "isn't a field" : "aren't fields"} this email can fill in, so{" "}
                {unresolved.length === 1 ? "it" : "they"} will be sent exactly as typed.
              </span>
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-line">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 border-b border-line bg-[#f8fafc] px-4 py-3 text-[13px] leading-5">
              {profile.email && (
                <>
                  <dt className="font-semibold text-[#64748b]">Reply-to</dt>
                  <dd className="min-w-0 break-words text-navy">{profile.email}</dd>
                </>
              )}
              <dt className="font-semibold text-[#64748b]">To</dt>
              <dd className="min-w-0 break-words text-navy">
                {sample.customerName} <span className="text-[#94a3b8]">&lt;jordan.smith@example.com&gt;</span>
              </dd>
              <dt className="font-semibold text-[#64748b]">Subject</dt>
              <dd className="min-w-0 break-words font-semibold text-navy">
                <Highlighted text={subject.slice(0, 200)} highlight={highlight} />
              </dd>
            </dl>
            {/* formatMessage escapes the text before adding its own markup. */}
            <div className="break-words px-4 py-4 text-[14px] leading-[22px] text-[#334155]" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            <p className="flex gap-2 border-t border-dashed border-line px-4 py-3 text-[12px] leading-4 text-[#94a3b8]">
              <Info className="size-3.5 shrink-0" />
              {AFTER_MESSAGE[templateKey]}
            </p>
          </div>

          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]">What each merge field fills in</h3>
            <div className="mt-2 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[520px] text-left text-[13px] leading-5">
                <thead className="bg-[#f8fafc] text-[12px] text-[#64748b]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Field</th>
                    <th className="px-3 py-2 font-semibold">Example</th>
                    <th className="px-3 py-2 font-semibold">Filled in with</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {keys.map((k) => (
                    <tr key={k} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-navy">{`{{${MERGE_FIELDS[k]}}}`}</td>
                      <td className="px-3 py-2 text-[#334155]">{sample[k]}</td>
                      <td className="px-3 py-2 text-[#64748b]">{MERGE_FIELD_HELP[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-[#f1f5f9] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="h-10 rounded-lg border border-[#94a3b8] px-5 text-[14px] font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** "Preview Email" button shown in every template editor. */
export function PreviewEmailButton({ templateKey, title, value }: { templateKey: TemplateKey; title: string; value: EmailTemplate }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded-[8px] border border-line bg-white px-3 text-[12px] font-semibold text-[#475569] transition-colors hover:border-brand hover:text-brand"
      >
        <Eye className="size-3.5" /> Preview Email
      </button>
      {open && <PreviewModal templateKey={templateKey} title={title} value={value} onClose={() => setOpen(false)} />}
    </>
  );
}
