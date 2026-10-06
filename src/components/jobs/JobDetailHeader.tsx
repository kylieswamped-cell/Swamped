"use client";

import { Archive, ArchiveRestore, CircleCheck, CircleDot, Download, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import ConfirmDialog from "@/components/customers/ConfirmDialog";
import Modal from "@/components/customers/Modal";
import { createInvoiceFromJob } from "@/lib/invoices/actions";
import { deleteJob, setJobArchived, setJobStatus } from "@/lib/jobs/actions";
import { JOB_STATUSES, type JobCustomerOption, type JobDetail, type JobStatus } from "@/lib/jobs/data";
import JobFormModal from "./JobFormModal";

type Dialog = "archive" | "unarchive" | "delete" | "completed" | null;

function CompletedDialog({ open, onClose, onInvoice, busy }: { open: boolean; onClose: () => void; onInvoice: () => void; busy: boolean }) {
  return (
    <Modal open={open} onClose={onClose} label="Job Completed Successfully!" className="max-w-[520px]">
      <div className="rounded-3xl bg-white p-10 shadow-2xl">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#dcfce7]">
            <CircleCheck className="size-6 fill-[#00c185] text-white" />
          </span>
          <h2 className="text-[24px] font-extrabold leading-9 text-[#0a1b33]">Job Completed Successfully!</h2>
        </div>
        <p className="mt-4 text-[15px] leading-6 text-[#6b7280]">
          Would you like to create an invoice for this job now? You can still create it later from the Job Detail action menu.
        </p>
        <div className="mt-8 flex flex-wrap justify-end gap-4">
          <button type="button" onClick={onClose} className="h-[45px] w-[140px] rounded-xl border border-[#e2e8f0] bg-white text-[14px] font-bold text-[#64748b] transition-colors hover:bg-[#f8fafc]">
            Return to Job
          </button>
          <button type="button" onClick={onInvoice} disabled={busy} className="h-[45px] w-[147px] rounded-xl bg-[#02c185] text-[14px] font-bold text-white transition-colors hover:bg-[#00a873] disabled:opacity-60">
            {busy ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function JobDetailHeader({
  job,
  customers,
  defaultTerms,
}: {
  job: JobDetail;
  customers: JobCustomerOption[];
  defaultTerms: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => !menu.current?.contains(e.target as Node) && setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const open = (d: Dialog) => {
    setMenuOpen(false);
    setError(undefined);
    setDialog(d);
  };

  const markStatus = (status: JobStatus) => {
    setMenuOpen(false);
    setError(undefined);
    startTransition(async () => {
      const result = await setJobStatus(job.id, status);
      if (result.error) return setError(result.error);
      router.refresh();
      if (status === "completed") setDialog("completed");
    });
  };

  const createInvoice = () => {
    setMenuOpen(false);
    setError(undefined);
    startTransition(async () => {
      const result = await createInvoiceFromJob(job.id);
      if (!result.id) {
        setDialog(null);
        return setError(result.error ?? "Couldn't create the invoice. Please try again.");
      }
      router.push(`/invoices/${result.id}`);
    });
  };

  const confirm = () =>
    startTransition(async () => {
      if (dialog === "delete") {
        const result = await deleteJob(job.id);
        if (result.error) return setError(result.error);
        setDialog(null);
        router.replace("/jobs");
        return;
      }
      const result = await setJobArchived(job.id, dialog === "archive");
      if (result.error) return setError(result.error);
      setDialog(null);
      router.refresh();
    });

  const downloadPdf = () => {
    setMenuOpen(false);
    // The browser's print dialog saves the page as a PDF.
    window.print();
  };

  const itemClass = "flex h-[45px] w-full items-center gap-5 px-4 text-left text-[14px] leading-[21px] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed";
  const divider = <div className="mx-[9px] h-px bg-[#f3f4f6]" />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/jobs" aria-label="Back to jobs" className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-[#f1f5f9] sm:-ml-[22px]">
            <Image src="/customers/back.svg" alt="" width={16} height={26} />
          </Link>
          <h2 className="truncate text-[30px] font-bold leading-9 text-[#111827]">Job Details: {job.number}</h2>
          {job.archived && (
            <span className="shrink-0 rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-2.5 py-0.5 text-[12px] font-medium text-[#64748b]">Archived</span>
          )}
        </div>

        <div className="flex items-center gap-[7px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-[41px] w-[75px] rounded-lg border border-[#00c185] bg-[#00c185] text-[14px] font-semibold text-white transition-colors hover:bg-[#00a873]"
          >
            Edit
          </button>
          <div ref={menu} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={pending}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-[41px] w-[181px] items-center justify-between rounded-lg border border-[#00c185] bg-white pl-[23px] pr-5 text-[14px] font-semibold text-[#00c185] transition-colors hover:bg-[#ecfdf5] disabled:opacity-60"
            >
              {pending ? "Working…" : "Quick Actions"}
              <Image src="/customers/chevron-down.svg" alt="" width={11} height={7} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-30 w-[240px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white py-2 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)]">
                {job.archived ? (
                  <>
                    <button type="button" role="menuitem" onClick={() => open("unarchive")} className={`${itemClass} h-10 text-[#475569]`}>
                      <ArchiveRestore className="size-4 text-[#6b7280]" />
                      Unarchive Job
                    </button>
                    <button type="button" role="menuitem" onClick={downloadPdf} className={`${itemClass} h-10 text-[#475569]`}>
                      <Download className="size-4 text-[#6b7280]" />
                      Download PDF
                    </button>
                    <button type="button" role="menuitem" onClick={() => open("delete")} className={`${itemClass} h-10 text-[#f87171]`}>
                      <Trash2 className="size-4" />
                      Delete Job
                    </button>
                  </>
                ) : (
                  <>
                    {JOB_STATUSES.map((s, i) => (
                      <div key={s.value}>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={s.value === job.status}
                          onClick={() => markStatus(s.value)}
                          className={`${itemClass} ${s.value === job.status ? "font-semibold text-[#00c185]" : "text-[#0a192f]"}`}
                        >
                          <CircleDot className={`size-3 ${s.value === job.status ? "text-[#00c185]" : "text-[#6b7280]"}`} />
                          Mark as {s.label.toLowerCase()}
                        </button>
                        {i === 0 && divider}
                      </div>
                    ))}
                    <button type="button" role="menuitem" onClick={createInvoice} className={`${itemClass} h-[55px] gap-[5px] text-[#0a192f]`}>
                      <Plus className="mx-1 size-4 text-[#2563eb]" strokeWidth={2.5} />
                      Create Invoice
                    </button>
                    <button type="button" role="menuitem" onClick={downloadPdf} className={`${itemClass} h-[41px] text-[#0a192f]`}>
                      <Download className="size-3.5 text-[#6b7280]" />
                      Download PDF
                    </button>
                    {divider}
                    <button type="button" role="menuitem" onClick={() => open("archive")} className={`${itemClass} text-[#6b7280]`}>
                      <Archive className="size-3.5 text-[#6b7280]" />
                      Archive Job
                    </button>
                    <button type="button" role="menuitem" onClick={() => open("delete")} className={`${itemClass} h-[41px] text-[#dc2626]`}>
                      <Trash2 className="size-3.5" />
                      Delete Job
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && !dialog && (
        <p role="alert" className="mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-[#b91c1c]">
          {error}
        </p>
      )}

      {editing && (
        <JobFormModal
          job={job}
          customers={customers}
          nextNumber={job.number}
          defaultTerms={defaultTerms}
          onClose={() => setEditing(false)}
          onSaved={(notice) => {
            setEditing(false);
            setError(notice);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={dialog === "archive"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Archive Job"
        message="Are you sure you want to archive this Job?"
        confirmLabel="Confirm Archive"
      />
      <ConfirmDialog
        open={dialog === "unarchive"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Unarchive Job"
        message="Are you sure you want to unarchive this Job?"
        confirmLabel="Confirm Unarchive"
      />
      <ConfirmDialog
        variant="plain"
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Delete Job ?"
        message="Are you sure you want to delete this Job ? This action cannot be undone."
        confirmLabel="Delete"
      />
      <CompletedDialog open={dialog === "completed"} onClose={() => setDialog(null)} onInvoice={createInvoice} busy={pending} />
    </>
  );
}
