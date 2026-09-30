"use client";

import { Archive, ArchiveRestore, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteCustomer, setCustomerArchived } from "@/lib/customers/actions";
import ConfirmDialog from "./ConfirmDialog";
import CustomerFormModal, { type CustomerFormValues } from "./CustomerFormModal";

type Dialog = "archive" | "unarchive" | "delete" | null;

// Quotes, invoices, and jobs get their own create screens later.
const createItems = ["Create Quote", "Create Invoice", "Create Job"];

export default function CustomerHeader({
  id,
  name,
  archived,
  values,
}: {
  id: string;
  name: string;
  archived: boolean;
  values: CustomerFormValues;
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

  const confirm = () =>
    startTransition(async () => {
      if (dialog === "delete") {
        const result = await deleteCustomer(id);
        if (result.error) return setError(result.error);
        setDialog(null);
        router.replace("/customers");
        return;
      }
      const result = await setCustomerArchived(id, dialog === "archive");
      if (result.error) return setError(result.error);
      setDialog(null);
      router.refresh();
    });

  const itemClass = "flex w-full items-center gap-3 px-5 text-left text-[15px] transition-colors hover:bg-[#f8fafc]";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={archived ? "/customers?tab=archived" : "/customers"}
            aria-label="Back to customers"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-[#f1f5f9] sm:-ml-8"
          >
            <Image src="/customers/back.svg" alt="" width={16} height={26} />
          </Link>
          <h2 className="truncate text-[30px] font-bold leading-9 tracking-[-0.2px] text-[#0f172a]">{name}</h2>
          {archived && (
            <span className="shrink-0 rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-2.5 py-0.5 text-[12px] font-medium text-[#64748b]">
              Archived
            </span>
          )}
        </div>

        <div className="flex items-center gap-[7px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-[41px] w-[75px] rounded-lg border border-[#00c185] bg-[#00c185] text-[14px] font-semibold tracking-[-0.1px] text-white transition-colors hover:bg-[#00a873]"
          >
            Edit
          </button>
          <div ref={menu} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-[41px] w-[181px] items-center justify-between rounded-lg border border-[#00c185] bg-white pl-[22px] pr-[18px] text-[14px] font-semibold tracking-[-0.1px] text-[#00c185] transition-colors hover:bg-[#ecfdf5]"
            >
              Quick Actions
              <Image src="/customers/chevron-down.svg" alt="" width={11} height={7} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-30 w-[240px] overflow-hidden rounded-xl border border-[#f1f5f9] bg-white py-2 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)]">
                {createItems.map((label, i) => (
                  <div key={label}>
                    <button
                      type="button"
                      role="menuitem"
                      aria-disabled="true"
                      title="Coming soon"
                      onClick={() => setMenuOpen(false)}
                      className={`${itemClass} h-[55px] cursor-not-allowed text-[#1e293b]`}
                    >
                      <Plus className="size-5 text-[#3b82f6]" />
                      {label}
                    </button>
                    {i === 0 && <div className="mx-2 h-px bg-[#f1f5f9]" />}
                  </div>
                ))}
                <div className="mx-2 h-px bg-[#f1f5f9]" />
                {archived ? (
                  <button type="button" role="menuitem" onClick={() => open("unarchive")} className={`${itemClass} h-[45px] text-[#64748b]`}>
                    <ArchiveRestore className="size-5 text-[#6b7280]" />
                    Unarchive Customer
                  </button>
                ) : (
                  <button type="button" role="menuitem" onClick={() => open("archive")} className={`${itemClass} h-[45px] text-[#64748b]`}>
                    <Archive className="size-5 fill-[#6b7280] text-white" />
                    Archive Customer
                  </button>
                )}
                <button type="button" role="menuitem" onClick={() => open("delete")} className={`${itemClass} h-[41px] text-[#dc2626]`}>
                  <Trash2 className="size-5" />
                  Delete Customer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <CustomerFormModal
          open
          customerId={id}
          initial={values}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
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
        title="Archive Customer"
        message="Are you sure you want to archive this Customer?"
        confirmLabel="Confirm Archive"
      />
      <ConfirmDialog
        open={dialog === "unarchive"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Unarchive Customer"
        message="Are you sure you want to unarchive this Customer?"
        confirmLabel="Confirm Unarchive"
      />
      <ConfirmDialog
        variant="plain"
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        busy={pending}
        error={error}
        title="Delete Customer ?"
        message="Are you sure you want to delete this Customer ?"
        confirmLabel="Delete"
      />
    </>
  );
}
