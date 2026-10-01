"use client";

import { Download, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { MAX_UPLOAD_BYTES, uploadAttachment } from "@/components/onboarding/uploadAttachment";
import { addJobFiles, deleteJobFile, jobFileUrl, saveInternalNotes } from "@/lib/jobs/actions";
import type { JobAttachment } from "@/lib/jobs/data";
import { fileSize } from "./format";
import JobFileCard from "./JobFileCard";

const ACCEPTS = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt";
const monthDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function JobInternalLogs({
  jobId,
  notes,
  files,
}: {
  jobId: string;
  notes: string;
  files: JobAttachment[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(notes);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const picker = useRef<HTMLInputElement>(null);

  const saveNotes = () => {
    if (value === saved) return;
    startTransition(async () => {
      const result = await saveInternalNotes(jobId, value);
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
          const path = await uploadAttachment(file, "jobs");
          uploaded.push({ path, name: file.name, size: file.size, type: file.type, internal: true });
        }
        const result = await addJobFiles(jobId, uploaded);
        if (result.error) return setError(result.error);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't upload the files. Please try again.");
      }
    });
  };

  const open = (id: string) =>
    startTransition(async () => {
      const result = await jobFileUrl(id);
      if (result.url) window.open(result.url, "_blank", "noopener");
      else setError(result.error);
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteJobFile(id);
      if (result.error) return setError(result.error);
      router.refresh();
    });

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
      <div className="mt-[18px] flex h-[78px] items-center justify-center gap-3 border-b border-[#e2e8f0] bg-[#f8fafc]/50">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#f1f5f9]">
          <LockKeyhole className="size-3.5 text-[#0a1b2f]" />
        </span>
        <h3 className="text-[18px] font-bold leading-7 text-[#0a1b2f]">Internal Logs (Private)</h3>
      </div>

      <div className="grid grid-cols-1 gap-8 px-6 pb-8 pt-6 lg:grid-cols-[minmax(0,552px)_minmax(0,415px)] lg:justify-between lg:px-8">
        <div className="lg:pt-[22px]">
          <label htmlFor="job-internal-log" className="text-[12px] font-bold uppercase leading-5 tracking-[0.6px] text-[#64748b]">
            Internal Notes
          </label>
          <textarea
            id="job-internal-log"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={saveNotes}
            placeholder="Private team notes about this job (visible only to you)"
            className="mt-[30px] h-[136px] w-full resize-y rounded-xl border border-[#1e293b] bg-[#f8fafc] px-6 py-6 text-[16px] leading-[26px] text-[#0a1b2f] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#00c185] lg:max-w-[420px]"
          />
          <p className="mt-1 h-4 text-[12px] text-[#94a3b8]">{pending ? "Saving…" : value !== saved ? "Unsaved changes" : ""}</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase leading-5 tracking-[0.6px] text-[#64748b]">Internal Attachments</span>
            <button type="button" onClick={() => picker.current?.click()} disabled={pending} className="flex items-center gap-1 text-[12px] font-semibold text-[#00c185] hover:text-[#00a873] disabled:opacity-50">
              <Plus className="size-3.5" strokeWidth={2.5} />
              Upload
            </button>
          </div>
          <input ref={picker} type="file" multiple accept={ACCEPTS} className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          <ul className="mt-8 flex flex-col gap-6">
            {files.map((f) => (
              <JobFileCard
                key={f.id}
                compact
                name={f.name}
                type={f.contentType}
                meta={[fileSize(f.sizeBytes), monthDay(f.createdAt)].filter(Boolean).join(" • ")}
                action={
                  <>
                    <button type="button" onClick={() => open(f.id)} aria-label={`Download ${f.name}`} className="rounded p-1 text-[#cbd5e1] transition-colors hover:text-[#475569]">
                      <Download className="size-4" />
                    </button>
                    <button type="button" onClick={() => remove(f.id)} disabled={pending} aria-label={`Delete ${f.name}`} className="rounded p-1 text-[#cbd5e1] transition-colors hover:text-[#ef4444] disabled:opacity-50">
                      <Trash2 className="size-4" />
                    </button>
                  </>
                }
              />
            ))}
            {files.length === 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => picker.current?.click()}
                  className="flex h-[66px] w-full items-center justify-center rounded-xl border-2 border-dashed border-[#e2e8f0] text-[14px] text-[#94a3b8] transition-colors hover:border-[#00c185]"
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
