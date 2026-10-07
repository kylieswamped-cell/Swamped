"use client";

import { CircleCheck, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { MAX_UPLOAD_BYTES, uploadAttachment } from "@/components/onboarding/uploadAttachment";
import { submitSupportRequest } from "@/lib/support/actions";
import { MAX_SUPPORT_FILES, SUPPORT_CATEGORIES, SUPPORT_UPLOAD_TYPES } from "@/lib/support/options";

const field =
  "w-full rounded-[12px] border border-[#e2e8f0] bg-[#f9fafb] px-4 text-[16px] text-[#0a192f] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185] focus:bg-white aria-invalid:border-[#ef4444]";
const label = "text-[14px] font-semibold leading-[21px] text-[#0a192f]";

function Error({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-[12px] leading-4 text-[#ef4444]">
      {message}
    </p>
  ) : null;
}

const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export default function SupportForm({ email }: { email: string }) {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null | undefined) {
    if (!list?.length) return;
    const picked = Array.from(list);
    const bad = picked.find((f) => !SUPPORT_UPLOAD_TYPES.includes(f.type));
    const big = picked.find((f) => f.size > MAX_UPLOAD_BYTES);
    const next = [...files, ...picked.filter((f) => SUPPORT_UPLOAD_TYPES.includes(f.type) && f.size <= MAX_UPLOAD_BYTES)];
    setErrors((e) => {
      const rest = { ...e };
      delete rest.attachments;
      if (bad) rest.attachments = `${bad.name} isn't an SVG, PNG, JPG or GIF.`;
      else if (big) rest.attachments = `${big.name} is larger than 10MB.`;
      else if (next.length > MAX_SUPPORT_FILES) rest.attachments = `Attach up to ${MAX_SUPPORT_FILES} files.`;
      return rest;
    });
    setFiles(next.slice(0, MAX_SUPPORT_FILES));
    if (input.current) input.current.value = "";
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!category) fieldErrors.category = "Choose an issue type.";
    if (!subject.trim()) fieldErrors.subject = "Enter a subject.";
    if (!message.trim()) fieldErrors.message = "Describe your request.";
    setErrors(fieldErrors);
    setFormError(undefined);
    if (Object.keys(fieldErrors).length) return;

    startTransition(async () => {
      try {
        const attachments = await Promise.all(files.map((f) => uploadAttachment(f, "support")));
        const result = await submitSupportRequest({ category, subject, message, attachments });
        if (result.fieldErrors) return setErrors(result.fieldErrors);
        if (result.error) return setFormError(result.error);
        setSent(true);
      } catch (err) {
        setFormError(err instanceof globalThis.Error ? err.message : "We couldn't send your request. Please try again.");
      }
    });
  }

  function reset() {
    setCategory("");
    setSubject("");
    setMessage("");
    setFiles([]);
    setErrors({});
    setSent(false);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center" role="status">
        <CircleCheck className="size-12 text-[#00c185]" />
        <h2 className="text-[22px] font-bold text-[#0a192f]">Support request sent</h2>
        <p className="max-w-[440px] text-[15px] leading-6 text-[#475569]">
          Thanks for reaching out. Our team will reply to <span className="font-semibold text-[#0a192f]">{email}</span> as soon as possible.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 h-11 rounded-[12px] border border-[#e2e8f0] px-6 text-[14px] font-semibold text-[#334155] transition-colors hover:bg-[#f8fafc]"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="category" className={label}>
          Category
        </label>
        <div className="relative">
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? "category-error" : undefined}
            className={`${field} h-12 cursor-pointer appearance-none pr-10`}
          >
            <option value="" disabled>
              Select an issue type ...
            </option>
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Image src="/support/select-chevron.svg" alt="" width={12} height={12} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
        </div>
        <Error id="category-error" message={errors.category} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="subject" className={label}>
          Subject
        </label>
        <input
          id="subject"
          value={subject}
          maxLength={200}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Issue with stripe payout synchronization"
          aria-invalid={errors.subject ? true : undefined}
          aria-describedby={errors.subject ? "subject-error" : undefined}
          className={`${field} h-12`}
        />
        <Error id="subject-error" message={errors.subject} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className={label}>
          Message
        </label>
        <textarea
          id="message"
          value={message}
          maxLength={5000}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your request in detail..."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`${field} h-[168px] resize-y py-[11px] leading-6`}
        />
        <Error id="message-error" message={errors.message} />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Attachments (Optional)</span>
        <input
          ref={input}
          id="attachments"
          type="file"
          multiple
          accept={SUPPORT_UPLOAD_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />
        {files.length < MAX_SUPPORT_FILES && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`flex h-[163px] w-full flex-col items-center justify-center rounded-[12px] border-2 border-dashed transition-colors hover:border-[#00c185] ${
              dragging ? "border-[#00c185] bg-[#ecfdf5]" : "border-[#e2e8f0] bg-[#f9fafb]"
            }`}
          >
            <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#eff6ff]">
              <Upload className="size-5 text-[#2563eb]" strokeWidth={2.5} />
            </span>
            <span className="text-[14px] font-semibold leading-[21px] text-[#0a192f]">Click to upload or drag and drop</span>
            <span className="text-[12px] leading-[18px] text-[#9ca3af]">SVG, PNG, JPG or GIF (max. 10MB)</span>
          </button>
        )}
        {files.length > 0 && (
          <ul className="flex flex-col gap-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex h-12 items-center justify-between gap-3 rounded-[12px] border border-[#e2e8f0] bg-white px-4 text-[14px]">
                <span className="truncate text-[#0a192f]">{f.name}</span>
                <span className="ml-auto shrink-0 text-[12px] text-[#9ca3af]">{sizeLabel(f.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}
                  className="shrink-0 text-[#94a3b8] hover:text-[#ef4444]"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Error id="attachments-error" message={errors.attachments} />
      </div>

      <section className="rounded-[12px] bg-[#fff1f2] p-5 sm:p-6" aria-labelledby="stripe-notice">
        <div className="flex gap-4">
          <Image src="/support/warning.svg" alt="" width={20} height={20} className="mt-1 size-5 shrink-0" />
          <div className="flex flex-col gap-3">
            <h3 id="stripe-notice" className="text-[18px] font-bold leading-7 tracking-[-0.35px] text-[#1e293b]">
              Stripe Financial Infrastructure Notice
            </h3>
            <p className="text-[14px] leading-[22.75px] tracking-[-0.45px] text-[#475569]">
              Payment processing operations, automated bank payouts, verification compliance, and customer chargeback disputes are handled
              securely and directly via your connected Stripe Account dashboard. SWAMPED does not hold or manipulate your live contract funds and
              cannot bypass secure automated banking protocols.
            </p>
            <a
              href="https://support.stripe.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-fit items-center gap-2 px-6 py-3 text-[14px] font-semibold leading-5 tracking-[-0.23px] text-[#00c185] hover:underline"
            >
              Contact Stripe Help Center
              <Image src="/support/external-link.svg" alt="" width={12} height={12} />
            </a>
          </div>
        </div>
      </section>

      {formError && (
        <p role="alert" className="rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[14px] text-[#b91c1c]">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-[52px] w-full rounded-[12px] bg-[#00c185] text-[16px] font-semibold tracking-[-0.03px] text-white drop-shadow-[0_4px_6px_rgba(0,193,133,0.2)] transition-colors hover:bg-[#00ad77] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit Support Request"}
      </button>
    </form>
  );
}
