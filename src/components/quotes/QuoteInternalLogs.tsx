"use client";

import { Download, FileText, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { fileSize, shortDay } from "@/components/jobs/format";
import { MAX_UPLOAD_BYTES, uploadAttachment } from "@/components/onboarding/uploadAttachment";
import { addQuoteFiles, deleteQuoteFile, quoteFileUrl, saveQuoteInternalNotes } from "@/lib/quotes/actions";
import type { QuoteAttachment } from "@/lib/quotes/data";

const ACCEPTS = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt";

export default function QuoteInternalLogs({ quoteId, notes, files }: { quoteId: string; notes: string; files: QuoteAttachment[] }) {
  const router = useRouter();
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(notes);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const picker = useRef<HTMLInputElement>(null);

  const saveNotes = () => {
    if (value === saved) return;
    startTransition(async () => {
      const result = await saveQuoteInternalNotes(quoteId, value);
      if (result.error) return setError(result.error);
      setSaved(value);
      setError(undefined);
    });
  };

  const upload = (list: FileList | null) => {
    if (!list?.length) return;
    const picked = [...list];
    if (picked.some((f) => f.size > MAX_UPLOAD_BYTES)) return setError("Files must be 10 MB or smaller.");
    setError(undefined);
    startTransition(async () => {
      try {
        const uploaded = [];
        for (const file of picked) {
          const path = await uploadAttachment(file, "quotes");
          uploaded.push({ path, name: file.name, size: file.size, type: file.type, internal: true });
        }
        const result = await addQuoteFiles(quoteId, uploaded);
        if (result.error) return setError(result.error);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't upload the files. Please try again.");
      }
    });
  };

  const open = (id: string) =>
    startTransition(async () => {
      const result = await quoteFileUrl(id);
      if (result.url) window.open(result.url, "_blank", "noopener");
      else setError(result.error);
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteQuoteFile(id);
      if (result.error) return setError(result.error);
      router.refresh();
    });

  return (
    <section className="mt-[26px] overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-center gap-3 pt-6">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#f1f5f9]">
          <LockKeyhole className="size-3.5 text-[#0a1b2f]" />
        </span>
        <h3 className="text-[18px] font-bold leading-7 text-[#0a1b2f]">Internal Logs (Private)</h3>
      </div>

      <div className="grid grid-cols-1 gap-8 px-6 pb-10 pt-12 lg:grid-cols-[minmax(0,466px)_minmax(0,523px)] lg:justify-between lg:px-10">
        <div>
          <label htmlFor="quote-internal-log" className="flex h-5 items-center text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#64748b]">
            Internal Notes
          </label>
          <textarea
            id="quote-internal-log"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={saveNotes}
            placeholder="Private notes about this quote (visible only to you)"
            className="mt-[11px] h-[194px] w-full resize-y rounded-xl border border-[#1e293b] bg-[#f8fafc] p-6 text-[16px] italic leading-[26px] text-[#0a1b2f] outline-none transition-colors placeholder:not-italic placeholder:text-[#94a3b8] focus:border-[#00c185]"
          />
          <p className="mt-1 h-4 text-[12px] text-[#94a3b8]">{pending ? "Saving…" : value !== saved ? "Unsaved changes" : ""}</p>
        </div>

        <div>
          <div className="flex h-5 items-center justify-between">
            <span className="text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#64748b]">Internal Attachments</span>
            <button type="button" onClick={() => picker.current?.click()} disabled={pending} className="flex items-center gap-1 text-[12px] font-semibold text-[#00c185] hover:text-[#00a873] disabled:opacity-50 print:hidden">
              <Plus className="size-3.5" strokeWidth={2.5} />
              Upload
            </button>
          </div>
          <input ref={picker} type="file" multiple accept={ACCEPTS} className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          <ul className="mt-[11px] flex flex-col gap-3">
            {files.map((f) => (
              <li key={f.id} className="flex h-[74px] items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded border border-[#e2e8f0] bg-white">
                    <FileText className="size-[18px] text-[#0a1b2f]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold leading-5 text-[#0a1b2f]" title={f.name}>{f.name}</p>
                    <p className="truncate text-[12px] leading-4 text-[#64748b]">{[fileSize(f.sizeBytes), shortDay(f.createdAt)].filter(Boolean).join(" • ")}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 print:hidden">
                  <button type="button" onClick={() => open(f.id)} aria-label={`Download ${f.name}`} className="rounded p-1 text-[#94a3b8] hover:text-[#475569]">
                    <Download className="size-4" />
                  </button>
                  <button type="button" onClick={() => remove(f.id)} disabled={pending} aria-label={`Delete ${f.name}`} className="rounded p-1 text-[#94a3b8] hover:text-[#ef4444] disabled:opacity-50">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
            {files.length === 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => picker.current?.click()}
                  className="flex h-[74px] w-full items-center justify-center rounded-xl border-2 border-dashed border-[#e2e8f0] text-[14px] text-[#94a3b8] transition-colors hover:border-[#00c185]"
                >
                  No internal files. Click to upload.
                </button>
              </li>
            )}
          </ul>
          {error && <p role="alert" className="mt-3 text-[12px] text-[#ef4444]">{error}</p>}
        </div>
      </div>
    </section>
  );
}
