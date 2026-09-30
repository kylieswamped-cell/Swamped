"use client";

import { TriangleAlert } from "lucide-react";
import Modal from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string;
  /** "warning" is the archive style (icon + tinted footer); "plain" is the delete style. */
  variant?: "warning" | "plain";
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  busy = false,
  error,
  variant = "warning",
}: ConfirmDialogProps) {
  const errorText = error && (
    <p role="alert" className="mt-3 rounded-lg bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">
      {error}
    </p>
  );
  const buttons = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="h-10 rounded-lg px-4 text-[15px] font-medium text-[#334155] transition-colors hover:bg-[#f1f5f9] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="h-10 rounded-lg bg-[#e53935] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#d32f2f] disabled:opacity-60"
      >
        {busy ? "Working…" : confirmLabel}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} label={title} busy={busy} className={variant === "plain" ? "max-w-[440px]" : "max-w-[400px]"}>
      {variant === "warning" ? (
        <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="px-6 pb-5 pt-6">
            <h2 className="flex items-center gap-2.5 text-[18px] font-semibold text-[#0f172a]">
              <TriangleAlert className="size-5 fill-[#ea580c] text-white" strokeWidth={2.5} />
              {title}
            </h2>
            <p className="mt-4 text-[14px] leading-5 text-[#64748b]">{message}</p>
            {errorText}
          </div>
          <div className="flex justify-end gap-3 bg-[#f8fafc] px-6 py-4">{buttons}</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white px-8 pb-8 pt-8 shadow-2xl">
          <h2 className="text-[22px] font-bold text-[#1f2937]">{title}</h2>
          <p className="mt-3 text-[15px] leading-6 text-[#6b7280]">{message}</p>
          {errorText}
          <div className="mt-6 flex justify-end gap-3">{buttons}</div>
        </div>
      )}
    </Modal>
  );
}
