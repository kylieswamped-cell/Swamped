"use client";

import { ExternalLink, FileText, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addCustomerFiles, customerFileUrl, deleteCustomerFile, type UploadedFile } from "@/lib/customers/actions";
import type { CustomerAttachment } from "@/lib/customers/data";
import { ACCEPTED_UPLOADS, MAX_UPLOAD_BYTES, uploadAttachment } from "@/components/onboarding/uploadAttachment";
import Modal from "./Modal";

const sizeLabel = (bytes: number | null) =>
  bytes === null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function CustomerFiles({
  customerId,
  attachments,
  cardClass,
}: {
  customerId: string;
  attachments: CustomerAttachment[];
  cardClass: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const picker = useRef<HTMLInputElement>(null);

  const count = attachments.length;

  const view = async (id: string) => {
    setError(undefined);
    setBusyId(id);
    // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL.
    const tab = window.open("", "_blank");
    const result = await customerFileUrl(id);
    setBusyId(null);
    if (result.url && tab) tab.location.href = result.url;
    else {
      tab?.close();
      setError(result.error ?? "Couldn't open the file.");
    }
  };

  const remove = async (id: string) => {
    setError(undefined);
    setBusyId(id);
    const result = await deleteCustomerFile(id);
    setBusyId(null);
    if (result.error) setError(result.error);
    else router.refresh();
  };

  const upload = (list: FileList | null) => {
    if (!list?.length) return;
    const picked = [...list];
    if (picked.some((f) => f.size > MAX_UPLOAD_BYTES)) {
      setError("Files must be 10 MB or smaller.");
      return;
    }
    setError(undefined);
    startUpload(async () => {
      try {
        const uploaded: UploadedFile[] = [];
        for (const file of picked) {
          uploaded.push({ path: await uploadAttachment(file, "customers"), name: file.name, size: file.size, type: file.type });
        }
        const result = await addCustomerFiles(customerId, uploaded);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't upload the files.");
      }
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${cardClass} flex flex-col justify-start text-left transition-colors hover:border-[#cbd5e1]`}>
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded bg-[#f1f5f9]">
            <Image src="/customers/files.svg" alt="" width={11} height={14} />
          </span>
          <h3 className="text-[16px] font-bold leading-6 tracking-[-0.19px] text-[#0f172a]">Files/Photos</h3>
        </div>
        <p className="mt-4 flex items-center justify-between text-[14px] leading-[21px] tracking-[-0.45px] text-[#64748b]">
          {count === 0 ? "No attachments" : `${count} Attachment${count === 1 ? "" : "s"}`}
          <Image src="/customers/chevron-right.svg" alt="" width={8} height={12} />
        </p>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} label="Files and photos" busy={uploading} className="max-w-[520px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-5">
            <h2 className="text-[20px] font-bold text-[#0f172a]">Files/Photos</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 text-[#94a3b8] hover:bg-[#f1f5f9]">
              <X className="size-5" />
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
            {count === 0 ? (
              <p className="py-8 text-center text-[14px] text-[#94a3b8]">No files yet. Upload photos or documents for this customer.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-3 py-2.5">
                    <FileText className="size-5 shrink-0 text-[#64748b]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[#334155]">{a.name}</p>
                      <p className="text-[12px] text-[#94a3b8]">
                        {[sizeLabel(a.sizeBytes), new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                    <button type="button" disabled={busyId === a.id} onClick={() => view(a.id)} aria-label={`Open ${a.name}`} className="rounded p-1.5 text-[#475569] hover:bg-white hover:text-[#00c185] disabled:opacity-50">
                      <ExternalLink className="size-4" />
                    </button>
                    <button type="button" disabled={busyId === a.id} onClick={() => remove(a.id)} aria-label={`Delete ${a.name}`} className="rounded p-1.5 text-[#475569] hover:bg-white hover:text-[#ef4444] disabled:opacity-50">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p role="alert" className="mt-3 rounded-lg bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">{error}</p>}
          </div>

          <div className="flex justify-end border-t border-[#f1f5f9] bg-[#f8fafc] px-6 py-4">
            <input ref={picker} type="file" multiple accept={ACCEPTED_UPLOADS} className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            <button
              type="button"
              disabled={uploading}
              onClick={() => picker.current?.click()}
              className="h-10 rounded-lg bg-[#00c185] px-5 text-[14px] font-bold text-white transition-colors hover:bg-[#00a873] disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "+ Upload Files"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
