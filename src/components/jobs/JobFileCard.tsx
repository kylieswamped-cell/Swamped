import { FileImage, FileSpreadsheet, FileText } from "lucide-react";
import type { ReactNode } from "react";

function fileKind(name: string, type: string | null) {
  if (type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic)$/i.test(name)) return "image";
  if (/sheet|excel|csv/.test(type ?? "") || /\.(xlsx?|csv)$/i.test(name)) return "sheet";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  return "doc";
}

const KIND = {
  pdf: { bg: "bg-[#fef2f2]", Icon: FileText, color: "text-[#ef4444]" },
  image: { bg: "bg-[#eff6ff]", Icon: FileImage, color: "text-[#3b82f6]" },
  sheet: { bg: "bg-[#f0fdf4]", Icon: FileSpreadsheet, color: "text-[#22c55e]" },
  doc: { bg: "bg-[#f1f5f9]", Icon: FileText, color: "text-[#64748b]" },
};

/** A file row with a type icon: 74px tall in the customer section, 66px ("compact") in internal logs. */
export default function JobFileCard({
  name,
  meta,
  type,
  action,
  compact = false,
}: {
  name: string;
  meta: string;
  type: string | null;
  action: ReactNode;
  compact?: boolean;
}) {
  const { bg, Icon, color } = KIND[fileKind(name, type)];
  return (
    <li className={`flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white ${compact ? "h-[66px] px-3" : "h-[74px] px-4"}`}>
      <div className={`flex min-w-0 items-center ${compact ? "gap-3" : "gap-4"}`}>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded ${bg}`}>
          <Icon className={`size-5 ${color}`} />
        </span>
        <div className="min-w-0">
          <p className={`truncate text-[14px] leading-5 ${compact ? "font-semibold text-[#0f172a]" : "font-bold text-[#0a1b2f]"}`} title={name}>
            {name}
          </p>
          <p className={`truncate text-[12px] leading-4 ${compact ? "text-[#94a3b8]" : "text-[#64748b]"}`}>{meta}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">{action}</div>
    </li>
  );
}
