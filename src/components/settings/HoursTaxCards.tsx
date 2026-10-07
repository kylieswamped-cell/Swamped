"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { saveOperatingHours, saveTaxSettings } from "@/lib/settings/actions";
import type { SettingsData } from "@/lib/settings/data";
import { DAYS, TIME_ZONES, type DayHours } from "@/lib/settings/options";
import { CardFooter, FieldError, SelectInput, SettingsCard, Toggle } from "./ui";
import { useSettingsForm } from "./useSettingsForm";

// Every half hour, shown as "09:00 AM".
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 ? "30" : "00";
  const value = `${String(h).padStart(2, "0")}:${m}`;
  const label = `${String(h % 12 || 12).padStart(2, "0")}:${m} ${h < 12 ? "AM" : "PM"}`;
  return { value, label };
});

function TimeSelect({ value, onChange, label, disabled }: { value: string; onChange: (v: string) => void; label: string; disabled: boolean }) {
  if (disabled) {
    return (
      <span className="flex h-9 w-24 items-center justify-center rounded-[8px] border border-[#e2e8f0] bg-[#f1f5f9] text-[14px] font-medium tracking-[-0.55px] text-[#9ca3af]">
        Closed
      </span>
    );
  }
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-24 cursor-pointer appearance-none rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] text-center text-[14px] font-medium tracking-[-0.57px] text-[#334155] outline-none transition-colors [text-align-last:center] focus:border-[#10b981]"
    >
      {TIMES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

function DayRow({ label, day, onChange, error }: { label: string; day: DayHours; onChange: (d: DayHours) => void; error?: string }) {
  return (
    <div>
      <div
        className={`flex flex-col gap-3 rounded-[12px] border px-4 py-4 sm:h-[68px] sm:flex-row sm:items-center sm:justify-between sm:py-0 ${
          day.open ? "border-[#f1f5f9] bg-white" : "border-[#e2e8f0] bg-[#f8fafc] opacity-80"
        }`}
      >
        <span className={`w-24 text-[14px] font-semibold leading-5 ${day.open ? "text-[#334155]" : "text-[#9ca3af]"}`}>{label}</span>
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex w-[102px] items-center justify-end gap-3">
            <span className={`text-[12px] font-bold uppercase leading-4 ${day.open ? "text-[#059669]" : "text-[#9ca3af]"}`}>
              {day.open ? "Open" : "Closed"}
            </span>
            <Toggle size="md" color="#00c185" checked={day.open} onChange={(open) => onChange({ ...day, open })} label={`${label} open`} />
          </div>
          <div className="flex items-center gap-2">
            <TimeSelect label={`${label} opens`} value={day.from} onChange={(from) => onChange({ ...day, from })} disabled={!day.open} />
            <span className={`text-[12px] ${day.open ? "text-[#94a3b8]" : "text-[#cbd5e1]"}`}>—</span>
            <TimeSelect label={`${label} closes`} value={day.to} onChange={(to) => onChange({ ...day, to })} disabled={!day.open} />
          </div>
        </div>
      </div>
      <FieldError id={`hours-${label}-error`} message={error} />
    </div>
  );
}

export function OperatingHoursCard({ data }: { data: SettingsData["hours"] }) {
  const form = useSettingsForm(data, saveOperatingHours);
  const { values: v, set, update, errors } = form;

  return (
    <SettingsCard
      id="hours"
      title="Operating Hours & Time Zone Settings"
      titleClass="text-[20px] font-bold leading-7 tracking-[-0.21px] text-[#0a192f]"
      subtitle="Configure your business availability and local timing."
      aside={
        <label className="flex cursor-pointer items-center gap-3 text-[14px] leading-5 text-[#374151]">
          Show Operating Hours on Quotes &amp; Invoices
          <Toggle
            checked={v.showOnDocs}
            onChange={(c) => set("showOnDocs", c)}
            label="Show operating hours on quotes and invoices"
            color="#009d63"
          />
        </label>
      }
    >
      <form onSubmit={form.submit} noValidate className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <label htmlFor="timeZone" className="text-[14px] font-bold leading-5 text-[#1e293b]">
            Primary Business Time Zone
          </label>
          <SelectInput
            id="timeZone"
            value={v.timeZone}
            onChange={(e) => set("timeZone", e.target.value)}
            className="h-12 w-full rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-4 text-[16px] text-[#334155] outline-none focus:border-[#10b981]"
          >
            {TIME_ZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-[14px] font-bold uppercase leading-5 tracking-[0.7px] text-[#1e293b]">Weekly Schedule</h3>
          <div className="flex flex-col gap-3">
            {DAYS.map((d) => (
              <DayRow
                key={d.key}
                label={d.label}
                day={v.hours[d.key]}
                error={errors[d.key]}
                onChange={(day) => update((s) => ({ ...s, hours: { ...s.hours, [d.key]: day } }))}
              />
            ))}
          </div>
        </div>

        <CardFooter pending={form.pending} dirty={form.dirty} onCancel={form.cancel} status={form.status} className="" />
      </form>
    </SettingsCard>
  );
}

const formatRate = (r: number) => `${Number(r.toFixed(3))}%`;

export function TaxCard({ data }: { data: SettingsData["tax"] }) {
  const [savedDraft, setSavedDraft] = useState(String(data.taxRate));
  const form = useSettingsForm(data, saveTaxSettings, (saved) => {
    setSavedDraft(String(saved.taxRate));
    return saved;
  });
  const { values: v, update, errors, setErrors } = form;
  const [draft, setDraft] = useState(String(data.taxRate));

  function setDefault(text: string) {
    setDraft(text);
    const n = Number(text.replace("%", ""));
    update((s) => ({ ...s, taxRate: text.trim() === "" ? NaN : n }));
  }

  function addRate() {
    const n = Number(draft.replace("%", ""));
    if (!(n >= 0 && n <= 100) || draft.trim() === "") return setErrors({ taxRate: "Enter a rate between 0 and 100." });
    setErrors({});
    update((s) => ({ ...s, taxRates: [...new Set([...s.taxRates, Number(n.toFixed(3))])].sort((a, b) => a - b) }));
  }

  return (
    <SettingsCard
      id="tax"
      title="Global Tax Configuration"
      titleClass="text-[20px] font-bold leading-7 text-[#111827]"
      subtitle="Set your default taxation rules for automated billing."
    >
      <form onSubmit={form.submit} noValidate>
        <label htmlFor="taxRate" className="block text-[14px] font-bold uppercase leading-5 tracking-[-0.35px] text-[#374151]">
          Business-Level Default Tax Rate (%)
        </label>
        <div className="mt-2 flex items-center gap-2.5">
          <input
            id="taxRate"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDefault(e.target.value)}
            aria-invalid={errors.taxRate ? true : undefined}
            className="h-12 w-[192px] rounded-[8px] border border-[#e5e7eb] bg-white px-4 font-mono text-[16px] text-[#111827] outline-none focus:border-[#10b981] aria-invalid:border-[#ef4444]"
          />
          <button
            type="button"
            onClick={addRate}
            className="flex h-[50px] items-center gap-2 rounded-[12px] bg-[#00c185] px-6 text-[16px] font-bold text-white shadow-[0_10px_15px_-3px_rgba(34,197,94,0.2),0_4px_6px_-4px_rgba(34,197,94,0.2)] transition-colors hover:bg-[#00ad77]"
          >
            <Image src="/settings/plus.svg" alt="" width={21} height={21} />
            Add
          </button>
        </div>
        <FieldError id="taxRate-error" message={errors.taxRate} />
        <p className="mt-4 flex max-w-[500px] gap-1 text-[12px] italic leading-[19.5px] text-[#9ca3af]">
          <Image src="/settings/info.svg" alt="" width={12} height={12} className="mt-[3.5px] size-3 shrink-0 self-start" />
          <span>
            Note: This rate will automatically apply as the baseline default for all new quotes and invoices, but remains fully editable per
            transaction when needed.
          </span>
        </p>

        {v.taxRates.length > 0 && (
          <ul className="mt-8 w-[192px] border-b border-[#e5e7eb]" aria-label="Saved tax rates">
            {v.taxRates.map((r) => {
              const isDefault = r === v.taxRate;
              return (
                <li key={r} className="group flex h-12 items-center border-t border-[#e5e7eb]">
                  <button
                    type="button"
                    onClick={() => setDefault(String(r))}
                    title="Use as default"
                    className="flex h-full flex-1 items-center gap-2 px-4 text-left font-mono text-[16px] text-[#111827] hover:bg-[#f8fafc]"
                  >
                    {formatRate(r)}
                    {isDefault && (
                      <span className="rounded bg-[#ecfdf5] px-1.5 font-sans text-[10px] font-bold uppercase leading-4 text-[#059669]">Default</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => update((s) => ({ ...s, taxRates: s.taxRates.filter((x) => x !== r) }))}
                    aria-label={`Remove ${formatRate(r)}`}
                    className="flex size-8 items-center justify-center rounded text-[#9ca3af] opacity-100 transition-opacity hover:text-[#ef4444] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <CardFooter
          pending={form.pending}
          dirty={form.dirty}
          onCancel={() => {
            form.cancel();
            setDraft(savedDraft);
          }}
          status={form.status}
        />
      </form>
    </SettingsCard>
  );
}
