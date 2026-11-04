import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";

/** Shown above a customer page when the business owner is previewing it. */
export default function PreviewBanner({ backHref, backLabel, draft }: { backHref: string; backLabel: string; draft: boolean }) {
  return (
    <div className="sticky top-0 z-50 -mx-4 -mt-6 mb-6 border-b border-[#fde68a] bg-[#fffbeb] px-4 py-3 sm:-mt-12 sm:mb-10 print:hidden">
      <div className="mx-auto flex max-w-[1024px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-[13px] leading-5 text-[#92400e]">
          <Eye className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Customer preview.</strong> This is what your customer sees{draft ? " once you send it" : ""}. Buttons and file downloads are
            turned off here.
          </span>
        </p>
        <Link
          href={backHref}
          className="flex h-8 shrink-0 items-center gap-1.5 self-start rounded-lg border border-[#fcd34d] bg-white px-3 text-[13px] font-semibold text-[#92400e] transition-colors hover:bg-[#fef3c7] sm:self-auto"
        >
          <ArrowLeft className="size-3.5" /> {backLabel}
        </Link>
      </div>
    </div>
  );
}
