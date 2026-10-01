"use client";

import { CalendarDays, Download, FileImage, FileSpreadsheet, FileText, Info, LockKeyhole, PencilLine, Plus, Trash2, UserRoundCheck, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition, type ReactNode } from "react";
import Modal from "@/components/customers/Modal";
import { ACCEPTED_UPLOADS, MAX_UPLOAD_BYTES, uploadAttachment } from "@/components/onboarding/uploadAttachment";
import { createJob, deleteJobFile, jobFileUrl, updateJob, type JobInput, type UploadedJobFile } from "@/lib/jobs/actions";
import { JOB_STATUSES, type JobCustomerOption, type JobDetail, type JobStatus } from "@/lib/jobs/data";
import { formatMoney, lineTotal } from "@/lib/quotes/totals";
import { dateTime, fileSize, toLocalInput } from "./format";
import JobLineItemModal, { type LineDraft } from "./JobLineItemModal";

type Saved = { id: string; name: string; sizeBytes: number | null; contentType: string | null; createdAt: string };

const labelClass = "text-[14px] font-semibold leading-5 text-[#374151]";
const fieldClass =
  "w-full rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-4 text-[16px] text-[#374151] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185] focus:bg-white aria-invalid:border-[#ef4444]";
const sectionLabel = "text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#64748b]";

const ACCEPTS = `${ACCEPTED_UPLOADS},.doc,.docx,.xls,.xlsx,.csv,.txt`;

function fileKind(name: string, type: string | null) {
  if (type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic)$/i.test(name)) return "image";
  if (/sheet|excel|csv/.test(type ?? "") || /\.(xlsx?|csv)$/i.test(name)) return "sheet";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  return "doc";
}

const KIND = {
  pdf: { bg: "bg-[#fef2f2]", Icon: FileText, color: "text-[#ef4444]" },
  image: { bg: "bg-[#eff6ff]", Icon: FileImage, color: "text-[#3b82f6]" },
  sheet: { bg: "bg-[#f0fdf4]", Icon: FileSpreadsheet, color: "text-[#22c55e]" },
  doc: { bg: "bg-[#f1f5f9]", Icon: FileText, color: "text-[#64748b]" },
};

const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function FileCard({ name, meta, type, action }: { name: string; meta: string; type: string | null; action: ReactNode }) {
  const { bg, Icon, color } = KIND[fileKind(name, type)];
  return (
    <li className="flex h-[74px] items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded ${bg}`}>
          <Icon className={`size-5 ${color}`} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold leading-5 text-[#0a1b2f]" title={name}>{name}</p>
          <p className="truncate text-[12px] leading-4 text-[#64748b]">{meta}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">{action}</div>
    </li>
  );
}

/** One half of the Scheduling box. The native picker sits invisibly over the formatted value. */
function ScheduleField({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="relative min-w-0 flex-1 px-4 py-4">
      <p className="text-[10px] font-bold uppercase leading-[15px] text-[#6b7280]">{label}</p>
      <div className="mt-1 flex h-6 items-center gap-3">
        <CalendarDays className="size-4 shrink-0 text-[#008080]" />
        <span className={`truncate text-[16px] font-semibold leading-6 ${value ? "text-[#111827]" : "text-[#9ca3af]"} ${invalid ? "text-[#ef4444]" : ""}`}>
          {value ? dateTime(new Date(value).toISOString()) : "Select date & time"}
        </span>
      </div>
      <input
        ref={input}
        type="datetime-local"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => input.current?.showPicker?.()}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label={`Clear ${label}`} className="absolute right-2 top-2 z-10 rounded p-0.5 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#475569]">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function SelectField({ id, value, onChange, invalid, className, children }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; className: string; children: ReactNode }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} className={`${fieldClass} ${className} appearance-none pr-10 ${value ? "" : "text-[#9ca3af]"}`}>
        {children}
      </select>
      <Image src="/jobs/select-chevron.svg" alt="" width={11} height={6} className="pointer-events-none absolute right-[18px] top-1/2 -translate-y-1/2" />
    </div>
  );
}

export default function JobFormModal({
  job,
  customers,
  nextNumber,
  defaultTerms,
  defaultCustomer,
  onClose,
  onSaved,
}: {
  /** Set when opening an existing job. */
  job?: JobDetail;
  customers: JobCustomerOption[];
  nextNumber: string;
  defaultTerms: string;
  defaultCustomer?: string;
  onClose: () => void;
  /** Called once saved; `notice` reports anything that didn't go through (e.g. the email). */
  onSaved: (notice?: string) => void;
}) {
  const editing = Boolean(job);
  const [customerId, setCustomerId] = useState(job?.customerId ?? defaultCustomer ?? "");
  const [title, setTitle] = useState(job?.title ?? "");
  const [status, setStatus] = useState<JobStatus>(job?.status ?? "unscheduled");
  const [startsAt, setStartsAt] = useState(toLocalInput(job?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(job?.endsAt ?? null));
  const [lines, setLines] = useState<LineDraft[]>(
    (job?.items ?? []).map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: i.unitPrice.toFixed(2), taxable: i.taxable })),
  );
  const [notes, setNotes] = useState(job?.notes ?? "");
  const [terms, setTerms] = useState(job ? (job.terms ?? "") : defaultTerms);
  const [editingTerms, setEditingTerms] = useState(false);
  const [internalNotes, setInternalNotes] = useState(job?.internalNotes ?? "");
  const [saved, setSaved] = useState<(Saved & { internal: boolean })[]>(job?.attachments ?? []);
  const [publicFiles, setPublicFiles] = useState<File[]>([]);
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const [lineModal, setLineModal] = useState<{ index: number | null } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const publicPicker = useRef<HTMLInputElement>(null);
  const internalPicker = useRef<HTMLInputElement>(null);

  // Scheduling a job moves it out of Unscheduled; clearing the start moves it back.
  const changeStart = (v: string) => {
    setStartsAt(v);
    if (v && status === "unscheduled") setStatus("scheduled");
    if (!v && status === "scheduled") setStatus("unscheduled");
  };

  const statusOptions = editing ? JOB_STATUSES : JOB_STATUSES.filter((s) => s.value === "scheduled" || s.value === "unscheduled");

  const addFiles = (list: FileList | null, internal: boolean) => {
    if (!list) return;
    const picked = [...list];
    const tooBig = picked.filter((f) => f.size > MAX_UPLOAD_BYTES);
    setError(tooBig.length ? `${tooBig.map((f) => f.name).join(", ")}: files must be 10 MB or smaller.` : undefined);
    const ok = picked.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    (internal ? setInternalFiles : setPublicFiles)((current) => [...current, ...ok]);
  };

  const updateLine = (index: number, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const openFile = (id: string) =>
    startTransition(async () => {
      const result = await jobFileUrl(id);
      if (result.url) window.open(result.url, "_blank", "noopener");
      else setError(result.error);
    });

  const removeSaved = (id: string) =>
    startTransition(async () => {
      const result = await deleteJobFile(id);
      if (result.error) return setError(result.error);
      setSaved((s) => s.filter((f) => f.id !== id));
    });

  const submit = (sendNow: boolean) => {
    setError(undefined);
    const input: JobInput = {
      customerId,
      title,
      status,
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: endsAt ? new Date(endsAt).toISOString() : "",
      notes,
      terms,
      internalNotes,
      items: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxable: l.taxable })),
    };
    const errors: Record<string, string> = {};
    if (!customerId) errors.customerId = "Select a customer.";
    if (!title.trim()) errors.title = "Enter a job title.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    startTransition(async () => {
      try {
        const uploaded: UploadedJobFile[] = [];
        for (const [files, internal] of [[publicFiles, false], [internalFiles, true]] as const) {
          for (const file of files) {
            const path = await uploadAttachment(file, "jobs");
            uploaded.push({ path, name: file.name, size: file.size, type: file.type, internal });
          }
        }
        const result = job ? await updateJob(job.id, input, uploaded, sendNow) : await createJob(input, uploaded, sendNow);
        if (result.fieldErrors) return setFieldErrors(result.fieldErrors);
        if (result.error && !result.id) return setError(result.error);
        onSaved(result.error ?? result.notice);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  };

  const publicSaved = saved.filter((f) => !f.internal);
  const internalSaved = saved.filter((f) => f.internal);
  const invalid = (k: string) => (fieldErrors[k] ? true : undefined);
  const fieldError = (k: string) => fieldErrors[k] && <p className="mt-1 text-[12px] text-[#ef4444]">{fieldErrors[k]}</p>;
  const removeButton = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} disabled={pending} aria-label={label} className="rounded p-1 text-[#cbd5e1] transition-colors hover:text-[#ef4444] disabled:opacity-50">
      <Trash2 className="size-4" />
    </button>
  );

  return (
    <Modal open onClose={onClose} label={editing ? `Job ${job!.number}` : "Create New Job"} busy={pending || lineModal !== null} className="max-w-[1152px]">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        className="flex max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-2xl bg-[#f8f9fa] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="relative flex h-[119px] shrink-0 items-end bg-white px-6 pb-[38px] sm:px-10">
          <h2 className="text-[24px] font-bold leading-8 tracking-[-0.3px] text-[#0a1b33]">{editing ? `Job ${job!.number}` : "Create New Job"}</h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="absolute right-[22px] top-[22px] rounded p-1 hover:bg-[#f1f5f9]">
            <Image src="/customers/close.svg" alt="" width={14} height={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-12 pt-[37px] sm:px-10">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,372fr)_minmax(0,432fr)_minmax(0,210fr)] lg:gap-x-[21px]">
            <div>
              <label htmlFor="job-customer" className={labelClass}>Select Customer</label>
              <div className="mt-2">
                <SelectField id="job-customer" value={customerId} onChange={setCustomerId} invalid={invalid("customerId")} className="h-11">
                  <option value="">{customers.length ? "Select a customer" : "Add a customer first"}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectField>
              </div>
              {fieldError("customerId")}
            </div>
            <div>
              <label htmlFor="job-title" className={labelClass}>Job Title / Specification</label>
              <input
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Comprehensive Site Assessment and Repair"
                aria-invalid={invalid("title")}
                maxLength={200}
                className={`${fieldClass} mt-2 h-11`}
              />
              {fieldError("title")}
            </div>
            <div>
              <label htmlFor="job-status" className={labelClass}>Job Status</label>
              <div className="mt-2">
                <SelectField id="job-status" value={status} onChange={(v) => setStatus(v as JobStatus)} invalid={invalid("status")} className="h-[42px] text-[#000]">
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </SelectField>
              </div>
              {fieldError("status")}
            </div>
          </div>

          <div className="mt-[18px] grid grid-cols-1 items-end gap-5 lg:grid-cols-[210px_minmax(0,1fr)_168px] lg:gap-x-[44px]">
            <div className="lg:mb-[14px]">
              <span className={labelClass}>Job Number</span>
              <p className="mt-2 flex h-[42px] items-center rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-4 text-[14px] font-medium leading-[21px] text-[#475569]">
                {job?.number ?? nextNumber}
              </p>
            </div>
            <div>
              <span className="text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#4b5563]">Scheduling</span>
              <div className="mt-2.5 flex flex-col rounded-xl border border-[#e5e7eb] bg-white sm:flex-row">
                <ScheduleField label="Start Date & Time" value={startsAt} onChange={changeStart} invalid={Boolean(fieldErrors.startsAt)} />
                <span className="h-px bg-[#e5e7eb] sm:h-auto sm:w-px sm:bg-[#111827]/80" />
                <ScheduleField label="End Date & Time" value={endsAt} onChange={setEndsAt} invalid={Boolean(fieldErrors.endsAt)} />
              </div>
              {fieldError("startsAt")}
              {fieldError("endsAt")}
            </div>
            <button
              type="button"
              onClick={() => setLineModal({ index: null })}
              className="flex h-[42px] items-center justify-center gap-2 rounded-[5px] bg-[#01c185] text-[14px] leading-6 tracking-[-0.2px] text-white transition-colors hover:bg-[#00a873] lg:mb-[18px]"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              Create Line Item
            </button>
          </div>

          <div className="mt-[17px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
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
                    <tr key={i} className="h-[77px]">
                      <td className="pl-7 pr-3">
                        <input
                          aria-label={`Line ${i + 1} description`}
                          value={l.description}
                          onChange={(e) => updateLine(i, { description: e.target.value })}
                          className="h-[35px] w-full rounded-md border border-[#e2e8f0] px-3 text-[16px] font-medium text-[#334155] outline-none focus:border-[#00c185]"
                        />
                      </td>
                      <td className="pl-12">
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
            {lines.length === 0 ? (
              <button
                type="button"
                onClick={() => setLineModal({ index: null })}
                className="flex h-[150px] w-full flex-col items-center justify-center gap-1 text-[14px] text-[#94a3b8] transition-colors hover:bg-[#f8fafc]"
              >
                <span className="font-semibold text-[#475569]">No line items yet</span>
                Click “Create Line Item” to add work or materials to this job.
              </button>
            ) : (
              <div className="flex justify-end border-t border-[#f1f5f9] px-6 py-4 text-[14px] text-[#475569]">
                Subtotal
                <span className="ml-6 min-w-[90px] text-right font-semibold text-[#0f172a]">
                  {formatMoney(lines.reduce((sum, l) => sum + lineTotal({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) }), 0))}
                </span>
              </div>
            )}
            {fieldErrors.items && <p className="px-6 pb-4 text-[12px] text-[#ef4444]">{fieldErrors.items}</p>}
          </div>

          <div className="mt-[60px] flex items-center justify-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#f0fdfa]">
              <UserRoundCheck className="size-[17px] text-[#00c38b]" />
            </span>
            <h3 className="text-[18px] font-bold leading-7 tracking-[-0.2px] text-[#0a1b2f]">Customer-Facing Information</h3>
          </div>

          <div className="mt-[40px] grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,527fr)_minmax(0,469fr)] lg:gap-[29px] lg:px-[25px]">
            <div>
              <label htmlFor="job-notes" className={sectionLabel}>Notes</label>
              <textarea
                id="job-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note for your customer, such as what's included or the expected timeline."
                className="mt-4 h-[230px] w-full resize-y rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-6 text-[16px] leading-[26px] text-[#0a1b2f] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#00c185] focus:bg-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className={sectionLabel}>Attachments</span>
                <button type="button" onClick={() => publicPicker.current?.click()} className="flex items-center gap-1 text-[12px] font-semibold text-[#00c185] hover:text-[#00a873]">
                  <Plus className="size-3.5" strokeWidth={2.5} />
                  Add files
                </button>
              </div>
              <input ref={publicPicker} type="file" multiple accept={ACCEPTS} className="sr-only" onChange={(e) => { addFiles(e.target.files, false); e.target.value = ""; }} />
              <ul className="mt-4 flex flex-col gap-3">
                {publicSaved.map((f) => (
                  <FileCard
                    key={f.id}
                    name={f.name}
                    type={f.contentType}
                    meta={[fileSize(f.sizeBytes), shortDay(f.createdAt)].filter(Boolean).join(" • ")}
                    action={
                      <>
                        <button type="button" onClick={() => openFile(f.id)} aria-label={`Download ${f.name}`} className="rounded p-1 text-[#cbd5e1] transition-colors hover:text-[#475569]">
                          <Download className="size-4" />
                        </button>
                        {removeButton(`Delete ${f.name}`, () => removeSaved(f.id))}
                      </>
                    }
                  />
                ))}
                {publicFiles.map((f, i) => (
                  <FileCard
                    key={`${f.name}-${i}`}
                    name={f.name}
                    type={f.type}
                    meta={`${fileSize(f.size)} • Not uploaded yet`}
                    action={removeButton(`Remove ${f.name}`, () => setPublicFiles(publicFiles.filter((_, j) => j !== i)))}
                  />
                ))}
                {publicSaved.length + publicFiles.length === 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => publicPicker.current?.click()}
                      className="flex h-[74px] w-full items-center justify-center rounded-xl border border-dashed border-[#e2e8f0] bg-white text-[14px] text-[#94a3b8] transition-colors hover:border-[#00c185]"
                    >
                      No files yet. Click to add files for your customer.
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="relative mt-[91px] rounded-3xl border border-[#f3f4f6] bg-white px-8 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] lg:ml-8">
            <h3 className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#9ca3af]">Terms and Conditions</h3>
            <button
              type="button"
              onClick={() => setEditingTerms(!editingTerms)}
              aria-label={editingTerms ? "Done editing terms" : "Edit terms"}
              aria-pressed={editingTerms}
              className="absolute right-[30px] top-[22px] rounded p-1.5 text-[#000] hover:bg-[#f1f5f9]"
            >
              <PencilLine className="size-4" />
            </button>
            {editingTerms ? (
              <textarea
                autoFocus
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                className="mt-[15px] w-full resize-y rounded-lg border border-[#e2e8f0] p-3 text-[14px] leading-[22.8px] text-[#475569] outline-none focus:border-[#00c185]"
              />
            ) : (
              <p className="mt-[15px] whitespace-pre-line text-[14px] leading-[22.8px] text-[#475569]">
                {terms || <span className="text-[#94a3b8]">No terms. Click the pencil to add them.</span>}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#f1f5f9]">
              <LockKeyhole className="size-3.5 text-[#0a1b2f]" />
            </span>
            <h3 className="text-[18px] font-bold leading-7 tracking-[-0.3px] text-[#0a1b2f]">Internal Logs (Private)</h3>
          </div>

          <div className="mt-[38px] grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-[31px] lg:pl-16">
            <div>
              <label htmlFor="job-internal-notes" className="flex items-center gap-2 text-[14px] font-bold leading-5 text-[#334155]">
                Internal Notes
                <Info className="size-2.5 text-[#94a3b8]" />
              </label>
              <textarea
                id="job-internal-notes"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal memos or cost notes (visible only to you)"
                className="mt-2 h-24 w-full resize-y rounded-xl border border-[#e2e8f0] bg-white p-4 text-[14px] leading-5 text-[#334155] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185]"
              />
            </div>
            <div>
              <span className="text-[14px] font-bold leading-5 text-[#334155]">Internal Attachments</span>
              <input ref={internalPicker} type="file" multiple accept={ACCEPTS} className="sr-only" onChange={(e) => { addFiles(e.target.files, true); e.target.value = ""; }} />
              <button
                type="button"
                onClick={() => internalPicker.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files, true); }}
                className={`mt-2 flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e2e8f0] px-4 text-center transition-colors hover:border-[#00c185] ${dragging ? "bg-[#ecfdf5]" : "bg-white"}`}
              >
                <span className="flex items-center gap-[11px] text-[14px] font-semibold leading-5 text-[#334155]">
                  <Image src="/customers/upload.svg" alt="" width={25} height={20} />
                  + Upload files &amp; Photos
                </span>
                <span className="max-w-[285px] text-[12px] leading-[15px] text-[#94a3b8]">
                  Drag and drop PDFs, images, or documents. Only you can see these.
                </span>
              </button>
              {(internalSaved.length > 0 || internalFiles.length > 0) && (
                <ul className="mt-3 flex flex-col gap-3">
                  {internalSaved.map((f) => (
                    <FileCard
                      key={f.id}
                      name={f.name}
                      type={f.contentType}
                      meta={[fileSize(f.sizeBytes), shortDay(f.createdAt)].filter(Boolean).join(" • ")}
                      action={
                        <>
                          <button type="button" onClick={() => openFile(f.id)} aria-label={`Download ${f.name}`} className="rounded p-1 text-[#cbd5e1] transition-colors hover:text-[#475569]">
                            <Download className="size-4" />
                          </button>
                          {removeButton(`Delete ${f.name}`, () => removeSaved(f.id))}
                        </>
                      }
                    />
                  ))}
                  {internalFiles.map((f, i) => (
                    <FileCard
                      key={`${f.name}-${i}`}
                      name={f.name}
                      type={f.type}
                      meta={`${fileSize(f.size)} • Not uploaded yet`}
                      action={removeButton(`Remove ${f.name}`, () => setInternalFiles(internalFiles.filter((_, j) => j !== i)))}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-8 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-[#b91c1c]">
              {error}
            </p>
          )}

          <div className="mt-[59px] flex flex-wrap justify-end gap-x-6 gap-y-3">
            <button type="button" onClick={onClose} disabled={pending} className="h-10 w-[87px] rounded-lg border border-[#0b192c] text-[14px] font-medium text-[#0b192c] transition-colors hover:bg-[#f1f5f9] disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="h-[41px] w-[117px] rounded-lg border border-[#02c185] bg-white text-[14px] font-bold text-[#02c185] transition-colors hover:bg-[#ecfdf5] disabled:opacity-60">
              {pending ? "Saving…" : editing ? "Save" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={pending}
              className="h-[41px] w-[149px] rounded-lg bg-[#02c185] text-[14px] font-bold text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#00a873] disabled:opacity-60"
            >
              Save &amp; Send
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
