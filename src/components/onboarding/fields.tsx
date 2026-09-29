"use client";

import { ChevronDown } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { AmountType } from "@/lib/quotes/totals";

export const inputClass =
  "h-12 w-full rounded-lg border border-[#e4e4e7] bg-[#fafafa] px-4 text-[16px] text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c9a7] focus:bg-white aria-invalid:border-[#ef4444]";

type FieldProps = {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, name, required, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-[14px] font-semibold leading-5 text-[#334155]">
        {label}
        {required && <span className="text-[#ef4444]">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-[12px] leading-4 text-[#ef4444]">
          {error}
        </p>
      ) : (
        hint && <p className="text-[12px] leading-4 text-[#94a3b8]">{hint}</p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<FieldProps, "children"> &
  InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; suffix?: string };

export function TextField({ label, name, required, hint, error, icon, suffix, ...input }: TextFieldProps) {
  return (
    <Field label={label} name={name} required={required} hint={hint} error={error}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            {icon}
          </span>
        )}
        <input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`${inputClass} ${icon ? "pl-10" : ""} ${suffix ? "pr-14" : ""}`}
          {...input}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#94a3b8]">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

type SelectFieldProps = Omit<FieldProps, "children"> &
  SelectHTMLAttributes<HTMLSelectElement> & { placeholder: string; options: string[] };

export function SelectField({ label, name, hint, error, placeholder, options, ...select }: SelectFieldProps) {
  return (
    <Field label={label} name={name} hint={hint} error={error}>
      <div className="relative">
        <select id={name} name={name} className={`${inputClass} appearance-none pr-10`} {...select}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[#64748b]" />
      </div>
    </Field>
  );
}

type TextAreaFieldProps = Omit<FieldProps, "children"> & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({ label, name, hint, error, ...textarea }: TextAreaFieldProps) {
  return (
    <Field label={label} name={name} hint={hint} error={error}>
      <textarea
        id={name}
        name={name}
        rows={3}
        className={`${inputClass} h-auto resize-y py-3 text-[14px]`}
        {...textarea}
      />
    </Field>
  );
}

/** A number input with a $ / % switch, used for deposits, discounts, and tax. */
export function AmountInput({
  name,
  value,
  type,
  onValue,
  onType,
  className = "",
}: {
  name: string;
  value: string;
  type: AmountType;
  onValue: (v: string) => void;
  onType: (t: AmountType) => void;
  className?: string;
}) {
  return (
    <div className={`flex h-12 items-center overflow-hidden rounded-lg border border-[#e4e4e7] bg-[#fafafa] focus-within:border-[#00c9a7] ${className}`}>
      <input
        id={name}
        name={name}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onValue(e.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent px-4 text-[16px] text-[#0f172a] outline-none"
      />
      <div className="mr-1.5 flex rounded-md bg-white p-0.5 text-[12px] font-semibold">
        {(["fixed", "percent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => onType(t)}
            className={`rounded px-2 py-1 transition-colors ${
              type === t ? "bg-[#e6f9f5] text-[#059669]" : "text-[#94a3b8] hover:text-[#334155]"
            }`}
          >
            {t === "fixed" ? "$" : "%"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  pending,
  className = "",
  ...button
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending || button.disabled}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#00c9a7] px-6 text-[16px] font-bold text-white shadow-[0_10px_15px_-3px_rgba(0,201,167,0.2),0_4px_6px_-4px_rgba(0,201,167,0.2)] transition-colors hover:bg-[#00b394] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...button}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[14px] text-[#b91c1c]">
      {message}
    </p>
  );
}
