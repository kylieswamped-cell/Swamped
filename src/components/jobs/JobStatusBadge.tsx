import { jobStatusLabel, type JobStatus } from "@/lib/jobs/data";

// In Progress, Completed, and the amber "Pending" style come from the Figma table.
const STYLES: Record<JobStatus, { badge: string; dot: string }> = {
  unscheduled: { badge: "border-[#e2e8f0] bg-[#f8fafc] text-[#475569]", dot: "bg-[#94a3b8]" },
  scheduled: { badge: "border-[#fef3c7] bg-[#fffbeb] text-[#92400e]", dot: "bg-[#f59e0b]" },
  in_progress: { badge: "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]", dot: "bg-[#3b82f6]" },
  completed: { badge: "border-[#d1fae5] bg-[#ecfdf5] text-[#065f46]", dot: "bg-[#10b981]" },
};

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  const s = STYLES[status] ?? STYLES.unscheduled;
  return (
    <span className={`inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-medium leading-3 ${s.badge}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {jobStatusLabel(status)}
    </span>
  );
}
