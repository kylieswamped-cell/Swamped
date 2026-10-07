"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

/** A collapsible settings card; the chevron left of the title folds it away. */
export function SettingsCard({
  id,
  title,
  subtitle,
  aside,
  titleClass = "text-[20px] font-bold leading-7 text-[#0f172a]",
  className = "",
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  /** Extra header content on the right, e.g. a toggle or status badge. */
  aside?: ReactNode;
  titleClass?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-6 rounded-[24px] border border-[#e2e8f0] bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] ${className}`}
    >
      <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          className="flex min-w-0 items-start gap-4 text-left"
        >
          <span className="mt-[10px] flex w-[15px] shrink-0">
            <Image
              src="/settings/chevron.svg"
              alt=""
              width={15}
              height={9}
              className={`transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
            />
          </span>
          <span className="min-w-0">
            <span id={`${id}-title`} className={`block ${titleClass}`}>
              {title}
            </span>
            {subtitle && <span className="mt-1 block text-[14px] leading-5 text-[#64748b]">{subtitle}</span>}
          </span>
        </button>
        {aside && <div className="flex shrink-0 items-center gap-3 pl-[31px] sm:pl-0">{aside}</div>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-8 sm:px-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const toggleSizes = {
  lg: { track: "h-6 w-12", knob: "size-5", on: "translate-x-[26px]", off: "translate-x-0.5" },
  md: { track: "h-5 w-10", knob: "size-[14px]", on: "translate-x-[23px]", off: "translate-x-[3px]" },
  notify: { track: "h-5 w-10", knob: "size-4", on: "translate-x-[22px]", off: "translate-x-0.5" },
  sm: { track: "h-5 w-9", knob: "size-4", on: "translate-x-[18px]", off: "translate-x-0.5" },
};

export function Toggle({
  checked,
  onChange,
  label,
  size = "lg",
  color = "#10b981",
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: keyof typeof toggleSizes;
  color?: string;
  disabled?: boolean;
}) {
  const s = toggleSizes[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={checked ? { backgroundColor: color } : undefined}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10b981] disabled:cursor-not-allowed disabled:opacity-50 ${s.track} ${
        checked ? "" : "bg-[#e2e8f0]"
      }`}
    >
      <span
        className={`rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-transform ${s.knob} ${checked ? s.on : s.off}`}
      />
    </button>
  );
}

/** "Show on Quotes & Invoices" and similar label + switch rows. */
export function ToggleRow({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-4 text-[14px] leading-5 text-[#374151]">
      {label}
      <Toggle checked={checked} onChange={onChange} label={label} color={color} />
    </label>
  );
}

export const fieldInput =
  "h-12 w-full rounded-[12px] border border-[#e2e8f0] bg-white px-4 text-[16px] text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#10b981] aria-invalid:border-[#ef4444] disabled:bg-[#f8fafc] disabled:text-[#6b7280]";

export function FieldLabel({ htmlFor, children, className = "" }: { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-[14px] font-semibold leading-5 text-[#334155] ${className}`}>
      {children}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[12px] leading-4 text-[#ef4444]">
      {message}
    </p>
  );
}

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  inputClass?: string;
  labelClass?: string;
  prefix?: string;
  suffix?: ReactNode;
};

export function InputField({ label, name, error, inputClass = fieldInput, labelClass, prefix, suffix, ...input }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={name} className={labelClass}>
        {label}
      </FieldLabel>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-[#94a3b8]">{prefix}</span>
        )}
        <input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`${inputClass} ${suffix ? "pr-24" : ""}`}
          style={prefix ? { paddingLeft: `${16 + prefix.length * 7.5}px` } : undefined}
          {...input}
        />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">{suffix}</span>}
      </div>
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

export function SelectInput({
  className = "",
  chevron = "lucide",
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> & { chevron?: "lucide" | "small" }) {
  return (
    <div className="relative">
      <select className={`appearance-none pr-10 ${className}`} {...select} />
      {chevron === "small" ? (
        <Image
          src="/settings/select-chevron.svg"
          alt=""
          width={10}
          height={6}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        />
      ) : (
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
      )}
    </div>
  );
}

export function CancelButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 rounded-[12px] border border-[#e2e8f0] px-6 text-[16px] font-bold tracking-[0.08px] text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
    >
      Cancel
    </button>
  );
}

export function SaveButton({
  pending,
  disabled,
  compact,
  className = "",
}: {
  pending?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`rounded-[12px] bg-[#00c185] font-bold text-white transition-colors hover:bg-[#00ad77] disabled:cursor-not-allowed disabled:opacity-60 ${
        compact
          ? "h-[41px] px-8 text-[14px] tracking-[-0.16px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
          : "h-[50px] px-8 text-[16px] shadow-[0_10px_15px_-3px_rgba(34,197,94,0.2),0_4px_6px_-4px_rgba(34,197,94,0.2)] sm:w-[176px]"
      } ${className}`}
    >
      {pending ? "Saving…" : "Save Changes"}
    </button>
  );
}

/** Status line plus Cancel / Save Changes, at the bottom of a settings card. */
export function CardFooter({
  pending,
  dirty,
  onCancel,
  status,
  bordered = false,
  hideCancel = false,
  compact = false,
  className = "mt-8",
}: {
  pending: boolean;
  dirty: boolean;
  onCancel: () => void;
  status: Status;
  bordered?: boolean;
  /** Save-only footers (notifications, payouts) as in the design. */
  hideCancel?: boolean;
  /** The smaller 14px Save Changes button. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${className} flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-end ${
        bordered ? "border-t border-[#f1f5f9] pt-8" : ""
      }`}
    >
      <StatusLine status={status} className="sm:mr-auto" />
      <div className="flex gap-3 sm:gap-4">
        {!hideCancel && <CancelButton onClick={onCancel} disabled={pending || !dirty} />}
        <SaveButton pending={pending} compact={compact} className="flex-1 sm:flex-none" />
      </div>
    </div>
  );
}

export type Status = { error?: string; notice?: string } | null;

export function StatusLine({ status, className = "" }: { status: Status; className?: string }) {
  if (!status?.error && !status?.notice) return null;
  return (
    <p
      role={status.error ? "alert" : "status"}
      className={`text-[14px] leading-5 ${status.error ? "text-[#dc2626]" : "text-[#059669]"} ${className}`}
    >
      {status.error ?? status.notice}
    </p>
  );
}
