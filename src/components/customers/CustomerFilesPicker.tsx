"use client";

import { Check, FolderOpen, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import FileCard from "@/components/jobs/JobFileCard";
import { fileSize, shortDay } from "@/components/jobs/format";
import { listCustomerFiles, type CustomerFileOption } from "@/lib/customers/actions";
import Modal from "./Modal";

/**
 * "Select from customer files" for the quote, job, and invoice forms: attaches
 * files already uploaded to the customer, without uploading them again.
 */
export default function CustomerFilesPicker({
  customerId,
  selected,
  onChange,
  /** Paths already attached to the record, which aren't offered again. */
  attachedPaths = [],
}: {
  customerId: string;
  selected: CustomerFileOption[];
  onChange: (files: CustomerFileOption[]) => void;
  attachedPaths?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<CustomerFileOption[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();
  const [loading, startLoading] = useTransition();

  const show = () => {
    setOpen(true);
    setPicked(new Set(selected.map((f) => f.path)));
    setError(undefined);
    setFiles(null);
    startLoading(async () => {
      const res = await listCustomerFiles(customerId);
      if (res.error) setError(res.error);
      setFiles((res.files ?? []).filter((f) => !attachedPaths.includes(f.path)));
    });
  };

  const toggle = (path: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <>
      <button
        type="button"
        onClick={show}
        disabled={!customerId}
        title={customerId ? undefined : "Choose a customer first"}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-[14px] font-semibold text-brand transition-colors hover:border-brand hover:bg-brand-light disabled:cursor-not-allowed disabled:text-[#94a3b8] disabled:hover:border-line disabled:hover:bg-white"
      >
        <FolderOpen className="size-4" />
        Select from customer files
      </button>

      {selected.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {selected.map((f) => (
            <FileCard
              key={f.path}
              name={f.name}
              type={f.contentType}
              meta={[fileSize(f.sizeBytes), "From customer files"].filter(Boolean).join(" • ")}
              action={
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((s) => s.path !== f.path))}
                  aria-label={`Remove ${f.name}`}
                  className="rounded p-1 text-[#cbd5e1] hover:text-[#ef4444]"
                >
                  <Trash2 className="size-4" />
                </button>
              }
            />
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} label="Select customer files" className="max-w-[480px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
          <div className="border-b border-line px-6 pb-4 pt-6">
            <h2 className="text-[20px] font-bold text-navy">Customer Files</h2>
            <p className="mt-1 text-[14px] text-muted">Choose files already saved to this customer.</p>
          </div>
          <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
            {loading || files === null ? (
              <p className="py-8 text-center text-[14px] text-[#94a3b8]">Loading files…</p>
            ) : error ? (
              <p className="py-8 text-center text-[14px] text-[#b91c1c]">{error}</p>
            ) : files.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-[#94a3b8]">
                This customer doesn&apos;t have any other files yet. Add files from the customer&apos;s page.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {files.map((f) => {
                  const on = picked.has(f.path);
                  return (
                    <li key={f.path}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(f.path)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? "border-brand bg-brand-light/60" : "border-line hover:bg-[#f8fafc]"}`}
                      >
                        <span className={`flex size-5 shrink-0 items-center justify-center rounded border ${on ? "border-brand bg-brand text-white" : "border-[#cbd5e1] bg-white"}`}>
                          {on && <Check className="size-3.5" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-navy">{f.name}</span>
                          <span className="block text-[12px] text-[#94a3b8]">{[fileSize(f.sizeBytes), shortDay(f.createdAt)].filter(Boolean).join(" • ")}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-line bg-[#f8fafc] px-6 py-4">
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg px-4 text-[14px] font-semibold text-[#475569] hover:bg-line">
              Cancel
            </button>
            <button
              type="button"
              disabled={!files}
              onClick={() => {
                const byPath = new Map([...selected, ...(files ?? [])].map((f) => [f.path, f]));
                onChange([...picked].map((p) => byPath.get(p)!).filter(Boolean));
                setOpen(false);
              }}
              className="h-10 rounded-lg bg-brand px-5 text-[14px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {picked.size ? `Attach ${picked.size} file${picked.size === 1 ? "" : "s"}` : "Done"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
