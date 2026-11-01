"use client";

import { joinItem, splitItem } from "@/lib/lineItems";

/** Inline table cell: edits the line item's name and keeps its details intact. */
export default function LineNameCell({
  value,
  onChange,
  label,
  className,
  disabled,
}: {
  value: string;
  onChange: (description: string) => void;
  label: string;
  className: string;
  disabled?: boolean;
}) {
  const { name, details } = splitItem(value);
  return (
    <>
      <input aria-label={label} value={name} onChange={(e) => onChange(joinItem(e.target.value, details))} placeholder="Item name" disabled={disabled} className={className} />
      {details.trim() && (
        <p title={details} className="mt-1 truncate px-[5px] text-[12px] leading-4 text-[#94a3b8]">
          {details}
        </p>
      )}
    </>
  );
}
