"use client";

import { CalendarDays, ChevronDown, CloudUpload, Download, FileText, LockKeyhole, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition, type ReactNode } from "react";
import Modal from "@/components/customers/Modal";
import { fileSize, shortDay } from "@/components/jobs/format";
import { AdjustmentInput } from "@/components/jobs/JobItemsCard";
import FileCard from "@/components/jobs/JobFileCard";
import JobLineItemModal, { type LineDraft } from "@/components/jobs/JobLineItemModal";
import { ACCEPTED_UPLOADS, MAX_UPLOAD_BYTES, uploadAttachment } from "@/components/onboarding/uploadAttachment";
import type { JobCustomerOption } from "@/lib/jobs/data";
import { createQuote, deleteQuoteFile, quoteFileUrl, updateQuote, type QuoteInput, type UploadedQuoteFile } from "@/lib/quotes/actions";
import type { QuoteDetail } from "@/lib/quotes/data";
import { formatMoney, lineTotal, quoteTotals, type AmountType } from "@/lib/quotes/totals";

export type QuoteDefaults = {
  number: string;
  terms: string;
  expirationDays: number;
  taxRate: number;
  depositValue: number;
  depositType: AmountType;
};

const labelClass = "text-[14px] font-semibold leading-5 text-[#374151]";
const fieldClass =
  "w-full rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-4 text-[16px] text-[#374151] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185] focus:bg-white aria-invalid:border-[#ef4444]";
const ACCEPTS = `${ACCEPTED_UPLOADS},.doc,.docx,.xls,.xlsx,.csv,.txt`;

/** YYYY-MM-DD for a date in the viewer's zone. */
function localDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const longDate = (v: string) =>
  new Date(`${v}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function DateField({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={`relative flex h-11 items-center gap-3 rounded-lg border bg-[#f3f4f6] px-[18px] ${invalid ? "border-[#ef4444]" : "border-[#e5e7eb]"}`}>
      <CalendarDays className="size-4 shrink-0 text-[#9ca3af]" />
      <span className={`truncate text-[16px] ${value ? "text-[#374151]" : "text-[#9ca3af]"}`}>{value ? longDate(value) : "Select a date"}</span>
      <input
        ref={input}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => input.current?.showPicker?.()}
        aria-invalid={invalid || undefined}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </div>
  );
}

/** A section heading with the Figma chevron that folds the section away. */
function Section({ title, icon, iconBg, open, onToggle, children }: { title: string; icon: ReactNode; iconBg: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="mt-[25px]">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex items-center gap-3 text-left">
        <ChevronDown className={`size-4 text-black transition-transform ${open ? "" : "-rotate-90"}`} strokeWidth={2.5} />
        <span className={`flex size-10 items-center justify-center rounded-full ${iconBg}`}>{icon}</span>
        <h3 className="text-[18px] font-bold uppercase leading-7 text-[#0f172a]">{title}</h3>
      </button>
      {open && children}
    </section>
  );
}

export default function QuoteFormModal({
  quote,
  customers,
  defaults,
  defaultCustomer,
  onClose,
  onSaved,
}: {
  /** Set when editing an existing quote. */
  quote?: QuoteDetail;
  customers: JobCustomerOption[];
  defaults: QuoteDefaults;
  defaultCustomer?: string;
  onClose: () => void;
  /** `send` is true for "Save & Send to Customer". */
  onSaved: (id: string, send: boolean, notice?: string) => void;
}) {
  const editing = Boolean(quote);
  const [today] = useState(() => new Date());
  const [customerId, setCustomerId] = useState(quote?.customerId ?? defaultCustomer ?? "");
  const [title, setTitle] = useState(quote?.title ?? "");
  const [quoteDate, setQuoteDate] = useState(quote?.quoteDate ?? localDate(today));
  const [expiresOn, setExpiresOn] = useState(() => {
    if (quote?.expiresOn) return quote.expiresOn;
    const d = new Date(today);
    d.setDate(d.getDate() + defaults.expirationDays);
    return localDate(d);
  });
  const [lines, setLines] = useState<LineDraft[]>(
    (quote?.items ?? []).map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: i.unitPrice.toFixed(2), taxable: i.taxable })),
  );
  const [adj, setAdj] = useState(() => {
    const a = quote?.adjustments;
    return {
      discountValue: String(a?.discountValue ?? 0),
      discountType: a?.discountType ?? ("fixed" as AmountType),
      taxValue: String(a?.taxValue ?? defaults.taxRate),
      taxType: a?.taxType ?? ("percent" as AmountType),
      depositValue: String(a?.depositValue ?? defaults.depositValue),
      depositType: a?.depositType ?? defaults.depositType,
    };
  });
  const [message, setMessage] = useState(quote?.message ?? "");
  const [terms, setTerms] = useState(quote ? (quote.terms ?? "") : defaults.terms);
  const [editingTerms, setEditingTerms] = useState(false);
  const [internalNotes, setInternalNotes] = useState(quote?.internalNotes ?? "");
  const [saved, setSaved] = useState((quote?.attachments ?? []).filter((f) => !f.internal));
  const [files, setFiles] = useState<File[]>([]);
  const [open, setOpen] = useState({ customer: true, terms: true, internal: true });
  const [lineModal, setLineModal] = useState<{ index: number | null } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const picker = useRef<HTMLInputElement>(null);

  const totals = quoteTotals(
    lines.map((l) => ({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxable: l.taxable })),
    {
      discountValue: Number(adj.discountValue) || 0,
      discountType: adj.discountType,
      taxValue: Number(adj.taxValue) || 0,
      taxType: adj.taxType,
      depositValue: Number(adj.depositValue) || 0,
      depositType: adj.depositType,
    },
  );

  const updateLine = (index: number, patch: Partial<LineDraft>) => setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = [...list];
    const tooBig = picked.filter((f) => f.size > MAX_UPLOAD_BYTES);
    setError(tooBig.length ? `${tooBig.map((f) => f.name).join(", ")}: files must be 10 MB or smaller.` : undefined);
    setFiles((current) => [...current, ...picked.filter((f) => f.size <= MAX_UPLOAD_BYTES)]);
  };

  const openFile = (id: string) =>
    startTransition(async () => {
      const result = await quoteFileUrl(id);
      if (result.url) window.open(result.url, "_blank", "noopener");
      else setError(result.error);
    });

  const removeSaved = (id: string) =>
    startTransition(async () => {
      const result = await deleteQuoteFile(id);
      if (result.error) return setError(result.error);
      setSaved((s) => s.filter((f) => f.id !== id));
    });

  const submit = (send: boolean) => {
    setError(undefined);
    const errors: Record<string, string> = {};
    if (!customerId) errors.customerId = "Select a customer.";
    if (!lines.length) errors.items = "Add at least one line item.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const input: QuoteInput = {
      customerId,
      title,
      quoteDate,
      expiresOn,
      message,
      terms,
      internalNotes,
      items: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxable: l.taxable })),
      adjustments: {
        discountValue: Number(adj.discountValue) || 0,
        discountType: adj.discountType,
        taxValue: Number(adj.taxValue) || 0,
        taxType: adj.taxType,
        depositValue: Number(adj.depositValue) || 0,
        depositType: adj.depositType,
      },
    };
    startTransition(async () => {
      try {
        const uploaded: UploadedQuoteFile[] = [];
        for (const file of files) {
          const path = await uploadAttachment(file, "quotes");
          uploaded.push({ path, name: file.name, size: file.size, type: file.type, internal: false });
        }
        const result = quote ? await updateQuote(quote.id, input, uploaded) : await createQuote(input, uploaded);
        if (result.fieldErrors) return setFieldErrors(result.fieldErrors);
        if (result.error && !result.id) return setError(result.error);
        onSaved(result.id!, send, result.error ?? result.notice);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  };

  const invalid = (k: string) => (fieldErrors[k] ? true : undefined);
  const fieldError = (k: string) => fieldErrors[k] && <p className="mt-1 text-[12px] text-[#ef4444]">{fieldErrors[k]}</p>;
  const heading = editing ? `Edit Quote ${quote!.number}` : "Create New Quote";

  return (
    <Modal open onClose={onClose} label={heading} busy={pending || lineModal !== null} className="max-w-[1154px]">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        className="flex max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f8f9fa] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="relative flex h-[150px] shrink-0 items-start bg-white px-6 pt-[61px] sm:px-10">
          <h2 className="text-[24px] font-bold leading-8 text-[#0f172a]">{heading}</h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="absolute right-[30px] top-[57px] rounded p-1 hover:bg-[#f1f5f9]">
            <Image src="/customers/close.svg" alt="" width={14} height={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-10 pt-[76px] sm:px-10">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-[130px]">
            <div>
              <label htmlFor="quote-customer" className={labelClass}>Select Customer</label>
              <div className="relative mt-[9px]">
                <select
                  id="quote-customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  aria-invalid={invalid("customerId")}
                  className={`${fieldClass} h-11 appearance-none pr-10 ${customerId ? "" : "text-[#9ca3af]"}`}
                >
                  <option value="">{customers.length ? "Select a customer" : "Add a customer first"}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Image src="/jobs/select-chevron.svg" alt="" width={11} height={6} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
              {fieldError("customerId")}
            </div>
            <div>
              <label htmlFor="quote-title" className={labelClass}>Job Title / Specification</label>
              <input
                id="quote-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g., Comprehensive Site Assessment and Repair"
                className={`${fieldClass} mt-[9px] h-11`}
              />
            </div>
          </div>

          <div className="mt-[18px] grid grid-cols-1 items-end gap-5 sm:grid-cols-3 lg:grid-cols-[212px_305px_307px_minmax(0,1fr)] lg:gap-x-[15px]">
            <div>
              <span className={labelClass}>Quote Number</span>
              <p className="mt-[9px] flex h-11 items-center rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-4 text-[16px] text-[#374151]">{quote?.number ?? defaults.number}</p>
            </div>
            <div className="lg:mr-[19px]">
              <label htmlFor="quote-date" className={labelClass}>Quote Date</label>
              <div className="mt-[9px]">
                <DateField id="quote-date" value={quoteDate} onChange={setQuoteDate} invalid={invalid("quoteDate")} />
              </div>
              {fieldError("quoteDate")}
            </div>
            <div>
              <label htmlFor="quote-expires" className={labelClass}>Quote Expiration</label>
              <div className="mt-[9px]">
                <DateField id="quote-expires" value={expiresOn} onChange={setExpiresOn} invalid={invalid("expiresOn")} />
              </div>
              {fieldError("expiresOn")}
            </div>
            <button
              type="button"
              onClick={() => setLineModal({ index: null })}
              className="flex h-[42px] items-center justify-center gap-2 rounded-[5px] bg-[#01c185] px-4 text-[14px] leading-6 text-white transition-colors hover:bg-[#00a873] sm:col-span-3 lg:col-span-1 lg:mb-px lg:ml-auto lg:w-[168px] lg:px-0"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              Create New Line Item
            </button>
          </div>

          <div className="mt-7 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] table-fixed text-left">
                <colgroup>
                  {["w-[33.3%]", "w-[12%]", "w-[17.9%]", "w-[17.9%]", "w-[9%]", "w-[9.9%]"].map((c, i) => (
                    <col key={i} className={c} />
                  ))}
                </colgroup>
                <thead className="bg-[#f8fafc] text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
                  <tr className="h-[46px] border-b border-[#e2e8f0]">
                    <th className="pl-6">Item Description</th>
                    <th className="pl-6">Quantity</th>
                    <th className="pr-6 text-right">Unit Price</th>
                    <th className="pr-6 text-right">Line Total</th>
                    <th className="text-center">Tax</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="h-[78px]">
                      <td className="pl-[31px] pr-3">
                        <input
                          aria-label={`Line ${i + 1} description`}
                          value={l.description}
                          onChange={(e) => updateLine(i, { description: e.target.value })}
                          className="h-[27px] w-full rounded-md border border-[#e2e8f0] px-[5px] text-[16px] font-medium text-[#334155] outline-none focus:border-[#00c185]"
                        />
                      </td>
                      <td className="pl-6">
                        <input
                          aria-label={`Line ${i + 1} quantity`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={l.quantity}
                          onChange={(e) => updateLine(i, { quantity: e.target.value })}
                          className="h-[34px] w-20 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 text-center text-[16px] text-[#0f172a] outline-none focus:border-[#00c185]"
                        />
                      </td>
                      <td className="pr-[21px]">
                        <div className="flex items-center justify-end gap-[19px]">
                          <span className="text-[16px] text-[#64748b]">$</span>
                          <input
                            aria-label={`Line ${i + 1} unit price`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={l.unitPrice}
                            onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                            className="h-[34px] w-20 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 text-[16px] text-[#334155] outline-none focus:border-[#00c185]"
                          />
                        </div>
                      </td>
                      <td className="pr-6 text-right text-[16px] font-semibold text-[#334155]">
                        {formatMoney(lineTotal({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }))}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={l.taxable}
                          aria-label={`Line ${i + 1} taxable`}
                          onClick={() => updateLine(i, { taxable: !l.taxable })}
                          className={`relative inline-flex h-5 w-10 rounded-full transition-colors ${l.taxable ? "bg-[#008080]" : "bg-[#cbd5e1]"}`}
                        >
                          <span className={`absolute top-1 size-3 rounded-full bg-white transition-all ${l.taxable ? "left-6" : "left-1"}`} />
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => setLineModal({ index: i })} aria-label={`View line ${i + 1}`} className="rounded p-0.5 hover:opacity-70">
                            <Image src="/customers/eye.svg" alt="" width={23} height={23} />
                          </button>
                          <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label={`Delete line ${i + 1}`} className="rounded p-0.5 text-[#6b7280] hover:text-[#ef4444]">
                            <Trash2 className="size-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lines.length === 0 && (
              <button
                type="button"
                onClick={() => setLineModal({ index: null })}
                className="flex h-[120px] w-full flex-col items-center justify-center gap-1 text-[14px] text-[#94a3b8] transition-colors hover:bg-[#f8fafc]"
              >
                <span className="font-semibold text-[#475569]">No line items yet</span>
                Click “Create New Line Item” to add work or materials to this quote.
              </button>
            )}
            {fieldErrors.items && <p className="px-6 pb-3 text-[12px] text-[#ef4444]">{fieldErrors.items}</p>}

            <div className="flex justify-end border-t border-[#f1f5f9] p-6">
              <div className="w-full rounded-[20px] border border-[#e5e7eb] bg-white p-6 lg:w-[418px]">
                <div className="flex items-center justify-between text-[14px] leading-5">
                  <span className="font-medium text-[#4b5563]">Subtotal</span>
                  <span className="font-semibold text-[#111827]">{formatMoney(totals.subtotal)}</span>
                </div>
                {(
                  [
                    ["Discount", "discount", `-${formatMoney(totals.discount)}`, "text-[#6b7280]"],
                    ["Tax", "tax", formatMoney(totals.tax), "text-[#4b5563]"],
                  ] as const
                ).map(([label, key, amount, color]) => (
                  <div key={key} className="mt-5 flex items-center justify-between text-[14px] leading-5">
                    <div className="flex items-center">
                      <span className="w-16 font-medium text-[#4b5563]">{label}</span>
                      <AdjustmentInput
                        label={label}
                        value={adj[`${key}Value`]}
                        type={adj[`${key}Type`]}
                        onValue={(v) => setAdj({ ...adj, [`${key}Value`]: v })}
                        onType={(t) => setAdj({ ...adj, [`${key}Type`]: t })}
                        onCommit={() => {}}
                      />
                    </div>
                    <span className={`font-medium ${color}`}>{amount}</span>
                  </div>
                ))}
                <div className="my-5 h-px bg-[#f3f4f6]" />
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-bold leading-6 text-[#111827]">Grand Total</span>
                  <span className="text-[18px] font-bold leading-7 text-[#059669]">{formatMoney(totals.total)}</span>
                </div>
                <div className="mt-[30px] flex items-center justify-between text-[14px] leading-5">
                  <div className="flex items-center">
                    <span className="w-[115px] font-medium text-[#4b5563]">Required Deposit</span>
                    <AdjustmentInput
                      label="Required deposit"
                      value={adj.depositValue}
                      type={adj.depositType}
                      onValue={(v) => setAdj({ ...adj, depositValue: v })}
                      onType={(t) => setAdj({ ...adj, depositType: t })}
                      onCommit={() => {}}
                    />
                  </div>
                  <span className="font-semibold text-[#1f2937]">{formatMoney(totals.deposit)}</span>
                </div>
                {fieldErrors.adjustments && <p className="mt-3 text-[12px] text-[#ef4444]">{fieldErrors.adjustments}</p>}
              </div>
            </div>
          </div>

          <Section
            title="Customer-Facing Information"
            icon={<FileText className="size-4 text-[#2563eb]" />}
            iconBg="bg-[#eff6ff]"
            open={open.customer}
            onToggle={() => setOpen({ ...open, customer: !open.customer })}
          >
            <div className="mt-[21px] grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-[70px]">
              <div>
                <label htmlFor="quote-message" className="text-[14px] font-semibold leading-5 text-[#4b5563]">Customer Message</label>
                <textarea
                  id="quote-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter a message that the customer will see on the final quote document..."
                  className="mt-2 h-[142px] w-full resize-y rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-[16px] leading-6 text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185] focus:bg-white"
                />
              </div>
              <div>
                <span className="text-[14px] font-semibold leading-5 text-[#4b5563]">Customer Attachments</span>
                <input ref={picker} type="file" multiple accept={ACCEPTS} className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <button
                  type="button"
                  onClick={() => picker.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                  className={`mt-2 flex h-[142px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e7eb] transition-colors hover:border-[#00c185] ${dragging ? "bg-[#ecfdf5]" : "bg-[#f9fafb]"}`}
                >
                  <CloudUpload className="size-9 text-[#d1d5db]" />
                  <span className="mt-2 text-[14px] leading-5 text-[#4b5563]">
                    <span className="font-semibold text-[#00c185]">Click to upload</span> or drag and drop
                  </span>
                  <span className="text-[12px] leading-4 text-[#9ca3af]">(PDF, JPG, PNG up to 10MB)</span>
                </button>
                {(saved.length > 0 || files.length > 0) && (
                  <ul className="mt-3 flex flex-col gap-3">
                    {saved.map((f) => (
                      <FileCard
                        key={f.id}
                        name={f.name}
                        type={f.contentType}
                        meta={[fileSize(f.sizeBytes), shortDay(f.createdAt)].filter(Boolean).join(" • ")}
                        action={
                          <>
                            <button type="button" onClick={() => openFile(f.id)} aria-label={`Download ${f.name}`} className="rounded p-1 text-[#cbd5e1] hover:text-[#475569]">
                              <Download className="size-4" />
                            </button>
                            <button type="button" onClick={() => removeSaved(f.id)} disabled={pending} aria-label={`Delete ${f.name}`} className="rounded p-1 text-[#cbd5e1] hover:text-[#ef4444]">
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        }
                      />
                    ))}
                    {files.map((f, i) => (
                      <FileCard
                        key={`${f.name}-${i}`}
                        name={f.name}
                        type={f.type}
                        meta={`${fileSize(f.size)} • Not uploaded yet`}
                        action={
                          <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="rounded p-1 text-[#cbd5e1] hover:text-[#ef4444]">
                            <Trash2 className="size-4" />
                          </button>
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>

          <section className="mt-[13px]">
            <div className="flex items-center gap-[24px]">
              <button type="button" onClick={() => setOpen({ ...open, terms: !open.terms })} aria-expanded={open.terms} className="flex items-center gap-6">
                <ChevronDown className={`size-4 text-black transition-transform ${open.terms ? "" : "-rotate-90"}`} strokeWidth={2.5} />
                <span className="text-[18px] font-bold leading-7 text-[#334155]">Terms and Condition</span>
              </button>
            </div>
            {open.terms && (
              <div className="relative mt-2">
                <textarea
                  aria-label="Terms and conditions"
                  value={terms}
                  readOnly={!editingTerms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="No terms yet. Click Edit to add them."
                  className={`h-[110px] w-full resize-y rounded-xl border border-[#e2e8f0] bg-[#f9fafb] py-4 pl-1 pr-20 text-[12px] leading-[19.5px] text-[#64748b] outline-none placeholder:text-[#9ca3af] ${editingTerms ? "focus:border-[#00c185] focus:bg-white" : "cursor-default"}`}
                />
                <button
                  type="button"
                  onClick={() => setEditingTerms(!editingTerms)}
                  className="absolute right-[38px] top-3 rounded bg-[#f1f5f9] px-2 py-1 text-[10px] leading-[15px] text-[#64748b] hover:bg-[#e2e8f0]"
                >
                  {editingTerms ? "Done" : "Edit"}
                </button>
              </div>
            )}
          </section>

          <Section
            title="Internal-Only Information"
            icon={<LockKeyhole className="size-4 text-[#ea580c]" />}
            iconBg="bg-[#fff7ed]"
            open={open.internal}
            onToggle={() => setOpen({ ...open, internal: !open.internal })}
          >
            <div className="mt-6 lg:w-[507px]">
              <label htmlFor="quote-internal" className="text-[14px] font-semibold leading-5 text-[#4b5563]">Internal Notes</label>
              <textarea
                id="quote-internal"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add private notes for your team only. These will not be visible to the customer..."
                className="mt-2 h-32 w-full resize-y rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-[16px] leading-6 text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185] focus:bg-white"
              />
            </div>
          </Section>

          {error && (
            <p role="alert" className="mt-6 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-[#b91c1c]">
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-wrap justify-end gap-x-3.5 gap-y-3">
            <button type="button" onClick={onClose} disabled={pending} className="h-10 w-[87px] rounded-lg border border-[#0b192c] text-[14px] font-medium text-[#0b192c] transition-colors hover:bg-[#f1f5f9] disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="h-[42px] rounded-lg border border-[#01c9a7] bg-white px-5 text-[14px] font-medium text-[#01a98c] transition-colors hover:bg-[#ecfdf5] disabled:opacity-60">
              {pending ? "Saving…" : editing ? "Save Changes" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={pending}
              className="h-[42px] w-[218px] rounded-lg bg-[#01c9a7] text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#00b394] disabled:opacity-60"
            >
              Save &amp; Send to Customer
            </button>
          </div>
        </div>
      </form>

      {lineModal && (
        <JobLineItemModal
          initial={lineModal.index !== null ? lines[lineModal.index] : undefined}
          onClose={() => setLineModal(null)}
          onSave={(line) => {
            setLines((ls) => (lineModal.index !== null ? ls.map((l, i) => (i === lineModal.index ? line : l)) : [...ls, line]));
            setLineModal(null);
          }}
        />
      )}
    </Modal>
  );
}
