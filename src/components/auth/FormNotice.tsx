import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function FormNotice({
  tone,
  text,
  className = "",
}: {
  tone: "success" | "error";
  text: string;
  className?: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-left text-[14px] leading-[20px] ${
        tone === "success"
          ? "border-brand/30 bg-brand/10 text-[#047857]"
          : "border-red-200 bg-red-50 text-red-600"
      } ${className}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      {text}
    </div>
  );
}
