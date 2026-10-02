"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Filter button with a checkbox menu, as in the Figma status and state dropdowns. */
export function FilterMenu<T extends string>({
  label,
  options,
  selected,
  onToggle,
  width,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  width: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex h-9 items-center justify-between gap-2 rounded-lg border px-4 text-[14px] font-medium leading-5 transition-colors ${
          selected.length ? "border-[#00c185] bg-[#ecfdf5] text-[#0f172a]" : "border-[#e2e8f0] bg-[#f9fafb] text-[#475569] hover:bg-white"
        } ${width}`}
      >
        <span className="truncate">{label}</span>
        <Image src="/jobs/chevron.svg" alt="" width={9} height={5} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[224px] rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_10px_-6px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.1)]">
          <div className="flex flex-col gap-3">
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <label key={o.value} className="flex h-5 cursor-pointer items-center gap-3 text-[14px] leading-5">
                  <input type="checkbox" checked={checked} onChange={() => onToggle(o.value)} className="size-4 accent-[#0075ff]" />
                  <span className={checked ? "font-semibold text-[#1e293b]" : "text-[#475569]"}>{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex h-6 items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-[#f1f5f9] pl-3 pr-2 text-[12px] font-semibold leading-4 text-[#475569]">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="flex size-4 items-center justify-center rounded-full hover:bg-[#e2e8f0]">
        <Image src="/jobs/chip-x.svg" alt="" width={6} height={6} />
      </button>
    </span>
  );
}

