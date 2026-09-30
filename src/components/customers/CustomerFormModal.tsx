"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { createCustomer, updateCustomer, type CustomerInput, type UploadedFile } from "@/lib/customers/actions";
import { ACCEPTED_UPLOADS, MAX_UPLOAD_BYTES, uploadAttachment } from "@/components/onboarding/uploadAttachment";
import Modal from "./Modal";

export type CustomerFormValues = CustomerInput;

const EMPTY: CustomerFormValues = { name: "", email: "", phone: "", streetAddress: "", notes: "" };

const baseInput =
  "w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] pr-4 text-[16px] text-[#0f172a] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#00c185] focus:bg-white aria-invalid:border-[#ef4444]";
const inputClass = `${baseInput} h-11 pl-[39px]`;
const labelClass = "text-[14px] font-semibold leading-5 text-[#334155]";

const fields = [
  { key: "name", label: "Customer Name", icon: "field-user", w: 12, placeholder: "e.g., John Doe", type: "text", autoComplete: "off" },
  { key: "email", label: "Email Address", icon: "field-mail", w: 14, placeholder: "e.g., john@example.com", type: "email", autoComplete: "off" },
  { key: "phone", label: "Phone Number", icon: "field-phone", w: 14, placeholder: "e.g., (555) 123-4567", type: "tel", autoComplete: "off" },
  { key: "streetAddress", label: "Street Address", icon: "field-pin", w: 11, placeholder: "e.g., 123 Maple St", type: "text", autoComplete: "off" },
] as const;

export default function CustomerFormModal({
  open,
  onClose,
  onSaved,
  customerId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  /** Set when editing an existing customer. */
  customerId?: string;
  initial?: CustomerFormValues;
}) {
  const editing = Boolean(customerId);
  const [values, setValues] = useState<CustomerFormValues>(initial ?? EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const picker = useRef<HTMLInputElement>(null);

  const reset = () => {
    setValues(initial ?? EMPTY);
    setFiles([]);
    setError(undefined);
    setFileError(undefined);
    setFieldErrors({});
  };
  const close = () => {
    if (pending) return;
    reset();
    onClose();
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = [...list];
    const tooBig = picked.filter((f) => f.size > MAX_UPLOAD_BYTES);
    setFileError(tooBig.length ? `${tooBig.map((f) => f.name).join(", ")}: files must be 10 MB or smaller.` : undefined);
    setFiles((current) => [...current, ...picked.filter((f) => f.size <= MAX_UPLOAD_BYTES)]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setFieldErrors({});
    if (!values.name.trim()) {
      setFieldErrors({ name: "Enter the customer's name." });
      return;
    }
    startTransition(async () => {
      try {
        const uploaded: UploadedFile[] = [];
        for (const file of files) {
          const path = await uploadAttachment(file, "customers");
          uploaded.push({ path, name: file.name, size: file.size, type: file.type });
        }
        const result = editing
          ? await updateCustomer(customerId!, values, uploaded)
          : await createCustomer(values, uploaded);
        if (result.fieldErrors) return setFieldErrors(result.fieldErrors);
        if (result.error && !result.id) return setError(result.error);
        reset();
        onSaved(result.id!);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <Modal open={open} onClose={close} label={editing ? "Edit Customer" : "Add New Customer"} busy={pending} className="max-w-[436px]">
      <form
        noValidate
        onSubmit={submit}
        className="overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-start justify-between px-8 pt-[31px]">
          <h2 className="text-[24px] font-bold leading-8 tracking-[-0.6px] text-[#0f172a]">
            {editing ? "Edit Customer" : "Add New Customer"}
          </h2>
          <button type="button" onClick={close} aria-label="Close" className="mt-[18px] rounded p-0.5 hover:bg-[#f1f5f9]">
            <Image src="/customers/close.svg" alt="" width={15} height={20} />
          </button>
        </div>

        <div className="flex max-h-[calc(100vh-220px)] flex-col gap-5 overflow-y-auto px-8 pb-6 pt-8">
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label htmlFor={`customer-${f.key}`} className={labelClass}>
                {f.label}
              </label>
              <div className="relative">
                <Image src={`/customers/${f.icon}.svg`} alt="" width={f.w} height={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id={`customer-${f.key}`}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  aria-invalid={fieldErrors[f.key] ? true : undefined}
                  className={inputClass}
                />
              </div>
              {fieldErrors[f.key] && <p className="text-[12px] text-[#ef4444]">{fieldErrors[f.key]}</p>}
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="customer-notes"
              rows={2}
              value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
              placeholder="Add notes here ....."
              className={`${baseInput} h-[67px] resize-y py-2.5 pl-3.5`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>File Upload</span>
            <input ref={picker} type="file" multiple accept={ACCEPTED_UPLOADS} className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <button
              type="button"
              onClick={() => picker.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              className={`flex h-[108px] flex-col items-center justify-center gap-2 rounded border border-dashed border-[rgba(45,212,191,0.5)] text-center text-[16px] leading-5 text-[#94a3b8] transition-colors hover:border-[#2dd4bf] ${dragging ? "bg-[#ecfdf5]" : "bg-[#f8fafc]"}`}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
                <Image src="/customers/upload.svg" alt="" width={25} height={20} />
              </span>
              <span>
                Drag and drop or
                <br />
                click to upload files
              </span>
            </button>
            {fileError && <p className="text-[12px] text-[#ef4444]">{fileError}</p>}
            {files.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {files.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[13px] text-[#334155]">
                    <span className="truncate">{file.name}</span>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-[#94a3b8] hover:text-[#ef4444]">
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-[#b91c1c]">
              {error}
            </p>
          )}
        </div>

        <div className="flex h-[88px] items-center justify-end gap-3 border-t border-[#f1f5f9] bg-[rgba(248,250,252,0.8)] px-8">
          <button type="button" onClick={close} disabled={pending} className="h-10 w-[88px] rounded-lg text-[14px] font-semibold tracking-[0.19px] text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="flex h-10 items-center gap-2.5 rounded-lg bg-[#00c185] px-6 text-[14px] font-bold text-white transition-colors hover:bg-[#00a873] disabled:opacity-60">
            {!editing && <Image src="/customers/plus.svg" alt="" width={10} height={12} />}
            {pending ? "Saving…" : editing ? "Save Changes" : "Add Customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
