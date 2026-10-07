"use client";

import { Clock, Info, Mail, ReceiptText, SlidersHorizontal, TriangleAlert, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { saveInvoiceConfig, saveQuoteConfig } from "@/lib/settings/actions";
import type { SettingsData } from "@/lib/settings/data";
import { DUE_DAY_OPTIONS, INVOICE_REMINDER_OPTIONS, PAST_DUE_REMINDER_OPTIONS, QUOTE_REMINDER_OPTIONS } from "@/lib/settings/options";
import type { EmailTemplate, EmailTemplates, TemplateKey } from "@/lib/settings/templates";
import { InvoiceTemplateCard, QuoteTemplateCard } from "./TemplateEditor";
import { CardFooter, FieldError, SelectInput, SettingsCard, Toggle } from "./ui";
import { useSettingsForm } from "./useSettingsForm";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Keeps the saved value selectable even when it isn't one of the presets. */
const withCurrent = (options: number[], current: number) => [...new Set([...options, current])].sort((a, b) => a - b);

type TemplateState<K extends TemplateKey> = { templates: Pick<EmailTemplates, K> };

/** Wires a template card to a section form: edits, errors, and its own Save. */
function templateProps<K extends TemplateKey, T extends TemplateState<K>>(
  form: ReturnType<typeof useSettingsForm<T>>,
  key: K,
) {
  return {
    templateKey: key,
    value: form.values.templates[key] as EmailTemplate,
    errors: form.errors,
    onChange: (t: EmailTemplate) => form.update((s) => ({ ...s, templates: { ...s.templates, [key]: t } })),
    onSaved: (t: EmailTemplate) => form.commit((s) => ({ ...s, templates: { ...s.templates, [key]: t } })),
  };
}

// Quote configuration -------------------------------------------------------------------

function SubHeading({ icon, children }: { icon: { src: string; w: number; h: number }; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Image src={icon.src} alt="" width={icon.w} height={icon.h} />
      <h3 className="text-[18px] font-semibold leading-7 text-[#0f172a]">{children}</h3>
    </div>
  );
}

export function QuoteConfigCard({ data, templates }: { data: SettingsData["quote"]; templates: EmailTemplates }) {
  const form = useSettingsForm(
    { ...data, depositValue: data.depositValue || (data.depositType === "percent" ? 20 : 0), templates: { quote: templates.quote, deposit: templates.deposit } },
    saveQuoteConfig,
  );
  const { values: v, set, errors } = form;

  return (
    <SettingsCard
      id="quotes"
      title="Quote Configuration"
      titleClass="text-[24px] font-bold leading-8 text-[#0f172a]"
      subtitle="Manage global defaults, reminder automation, and customer communication templates."
      className="border-[#f1f5f9]!"
    >
      <form onSubmit={form.submit} noValidate className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <SubHeading icon={{ src: "/settings/icon-file.svg", w: 10.5, h: 14 }}>Quote Defaults</SubHeading>
          <div className="flex flex-col gap-6 rounded-[16px] border border-[#f1f5f9] bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium leading-5 text-[#334155]">Require Deposit by Default</p>
                <p className="text-[12px] leading-4 text-[#94a3b8]">Automatically apply a deposit requirement to new quotes.</p>
              </div>
              <Toggle checked={v.depositRequired} onChange={(c) => set("depositRequired", c)} label="Require deposit by default" />
            </div>
            {v.depositRequired && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex rounded-[8px] bg-[#f1f5f9] p-1" role="group" aria-label="Deposit type">
                    {(["percent", "fixed"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={v.depositType === t}
                        onClick={() => set("depositType", t)}
                        className={`rounded-[6px] px-4 py-1.5 text-[12px] leading-4 transition-colors ${
                          v.depositType === t
                            ? "bg-white font-semibold text-[#0f172a] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
                            : "font-medium text-[#64748b] hover:text-[#334155]"
                        }`}
                      >
                        {t === "percent" ? "Fixed Percentage" : "Fixed Amount"}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-32">
                    {v.depositType === "fixed" && (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#94a3b8]">$</span>
                    )}
                    <input
                      aria-label="Default deposit value"
                      type="number"
                      min={0}
                      max={v.depositType === "percent" ? 100 : undefined}
                      step="0.01"
                      inputMode="decimal"
                      value={Number.isNaN(v.depositValue) ? "" : v.depositValue}
                      onChange={(e) => set("depositValue", e.target.value === "" ? NaN : Number(e.target.value))}
                      aria-invalid={errors.depositValue ? true : undefined}
                      className={`h-9 w-full rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] pr-8 text-[14px] text-[#0f172a] outline-none focus:border-[#10b981] aria-invalid:border-[#ef4444] ${
                        v.depositType === "fixed" ? "pl-6" : "pl-3"
                      }`}
                    />
                    {v.depositType === "percent" && (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#94a3b8]">%</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-[#94a3b8]">Default Value</span>
                </div>
                <FieldError id="depositValue-error" message={errors.depositValue} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label htmlFor="quoteTerms" className="text-[14px] font-medium leading-5 text-[#334155]">
                Default Quote Terms &amp; Conditions / Disclaimer
              </label>
              <textarea
                id="quoteTerms"
                rows={4}
                maxLength={5000}
                value={v.quoteTerms}
                onChange={(e) => set("quoteTerms", e.target.value)}
                placeholder="e.g. Payment is due within 30 days of quote acceptance…"
                className="min-h-[120px] w-full resize-y rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-[15px] text-[14px] leading-[22.75px] text-[#475569] outline-none placeholder:text-[#9ca3af] focus:border-[#10b981]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SubHeading icon={{ src: "/settings/icon-bell.svg", w: 12.25, h: 14 }}>Quote Reminder Settings</SubHeading>
          <div className="flex flex-col gap-4 rounded-[16px] border border-[#f1f5f9] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold leading-5 text-[#1e293b]">Quote Expiration Reminder</p>
              <p className="text-[12px] leading-4 text-[#64748b]">
                Automatically notify customers before their quote expires to encourage faster conversion.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <label htmlFor="quoteReminderDays" className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#94a3b8]">
                  Send Reminder
                </label>
                <SelectInput
                  id="quoteReminderDays"
                  chevron="small"
                  value={v.reminderDays}
                  disabled={!v.reminderEnabled}
                  onChange={(e) => set("reminderDays", Number(e.target.value))}
                  className="h-[30px] rounded-[8px] border border-[#e2e8f0] bg-white pl-3 text-[12px] font-medium text-[#334155] outline-none focus:border-[#10b981] disabled:opacity-60"
                >
                  {withCurrent(QUOTE_REMINDER_OPTIONS, v.reminderDays).map((d) => (
                    <option key={d} value={d}>
                      {plural(d, "Day")} Before Expiration
                    </option>
                  ))}
                </SelectInput>
              </div>
              <Toggle checked={v.reminderEnabled} onChange={(c) => set("reminderEnabled", c)} label="Quote expiration reminder" />
            </div>
          </div>
        </div>

        <QuoteTemplateCard
          {...templateProps(form, "quote")}
          title="Initial Quote Template"
          icon={{ src: "/settings/icon-mail.svg", w: 14, h: 10.5 }}
        />
        <QuoteTemplateCard
          {...templateProps(form, "deposit")}
          title="Deposit Receipt Template"
          icon={{ src: "/settings/icon-receipt.svg", w: 10.5, h: 14 }}
        />

        <CardFooter pending={form.pending} dirty={form.dirty} onCancel={form.cancel} status={form.status} bordered className="" />
      </form>
    </SettingsCard>
  );
}

// Invoice configuration -----------------------------------------------------------------

function Panel({ icon: Icon, iconClass, title, children }: { icon: LucideIcon; iconClass: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[16px] border border-[#f1f5f9] bg-white shadow-[0_0_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3 rounded-t-[16px] border-b border-[#f1f5f9] bg-[rgba(248,250,252,0.5)] px-4 py-5 sm:px-6">
        <span className={`flex size-8 items-center justify-center rounded-[8px] ${iconClass}`}>
          <Icon className="size-4" />
        </span>
        <h3 className="text-[18px] font-semibold leading-7 text-[#0f172a]">{title}</h3>
      </div>
      <div className="flex flex-col gap-6 p-4 sm:p-6">{children}</div>
    </section>
  );
}

function SwitchRow({ title, description, checked, onChange, border }: { title: string; description: string; checked: boolean; onChange: (c: boolean) => void; border?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${border ? "border-b border-[#f1f5f9] pb-6" : ""}`}>
      <div>
        <p className="text-[14px] font-medium leading-5 text-[#0f172a]">{title}</p>
        <p className="text-[12px] leading-4 text-[#64748b]">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

const invoiceSelect =
  "h-11 w-full rounded-[12px] border border-[#e2e8f0] bg-white px-3 text-[14px] text-[#0f172a] outline-none focus:border-[#10b981] disabled:opacity-60";

function DaysBox({ id, label, value, options, suffix, disabled, onChange }: { id: string; label: string; value: number; options: number[]; suffix: string; disabled: boolean; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-[#f1f5f9] bg-[#f8fafc] p-4">
      <label htmlFor={id} className="text-[14px] font-medium leading-5 text-[#334155]">
        {label}
      </label>
      <SelectInput id={id} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className={invoiceSelect}>
        {withCurrent(options, value).map((d) => (
          <option key={d} value={d}>
            {plural(d, "Day")}
            {suffix}
          </option>
        ))}
      </SelectInput>
    </div>
  );
}

export function InvoiceConfigCard({ data, templates }: { data: SettingsData["invoice"]; templates: EmailTemplates }) {
  const form = useSettingsForm(
    {
      ...data,
      templates: {
        invoice: templates.invoice,
        invoice_receipt: templates.invoice_receipt,
        invoice_reminder: templates.invoice_reminder,
        past_due_notice: templates.past_due_notice,
        past_due_reminder: templates.past_due_reminder,
      },
    },
    saveInvoiceConfig,
  );
  const { values: v, set, errors } = form;
  const teal = "bg-[#f0fdfa] text-[#14b8a6]";

  return (
    <SettingsCard
      id="invoices"
      title="Invoice Configuration"
      titleClass="text-[24px] font-bold leading-8 tracking-[-0.6px] text-[#0f172a]"
      subtitle="Manage defaults, reminders, and email templates for your billing."
    >
      <form onSubmit={form.submit} noValidate className="flex flex-col gap-8">
        <Panel icon={SlidersHorizontal} iconClass="bg-[#eef2ff] text-[#6366f1]" title="Invoice Defaults">
          <div className="flex flex-col gap-2">
            <label htmlFor="dueDays" className="text-[14px] font-medium leading-5 text-[#334155]">
              Default Due Date
            </label>
            <SelectInput id="dueDays" value={v.dueDays} onChange={(e) => set("dueDays", Number(e.target.value))} className={invoiceSelect}>
              {withCurrent(DUE_DAY_OPTIONS, v.dueDays).map((d) => (
                <option key={d} value={d}>
                  Net {d}
                </option>
              ))}
            </SelectInput>
            <FieldError id="dueDays-error" message={errors.dueDays} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="invoiceTerms" className="text-[14px] font-medium leading-5 text-[#334155]">
              Default Invoice Terms &amp; Conditions
            </label>
            <textarea
              id="invoiceTerms"
              rows={4}
              maxLength={5000}
              value={v.invoiceTerms}
              onChange={(e) => set("invoiceTerms", e.target.value)}
              placeholder="Enter your standard terms..."
              className="min-h-[104px] w-full resize-y rounded-[12px] border border-[#e2e8f0] bg-white px-3 py-[11px] text-[14px] leading-5 text-[#0f172a] outline-none placeholder:text-[#9ca3af] focus:border-[#10b981]"
            />
            <p className="flex items-center gap-1.5 text-[12px] leading-4 text-[#64748b]">
              <Info className="size-2.5" strokeWidth={3} />
              Automatically populates on all new invoice creations.
            </p>
          </div>
        </Panel>

        <Panel icon={Clock} iconClass="bg-[#fff7ed] text-[#f97316]" title="Reminder Settings">
          <SwitchRow
            title="Enable Invoice Reminders"
            description="Send automated emails before an invoice is due."
            checked={v.reminderEnabled}
            onChange={(c) => set("reminderEnabled", c)}
          />
          <DaysBox
            id="invoiceReminderDays"
            label="Days Before Due Date"
            value={v.reminderDays}
            options={INVOICE_REMINDER_OPTIONS}
            suffix=" Before"
            disabled={!v.reminderEnabled}
            onChange={(n) => set("reminderDays", n)}
          />
        </Panel>

        <Panel icon={TriangleAlert} iconClass="bg-[#fef2f2] text-[#ef4444]" title="Past Due Settings">
          <SwitchRow
            title="Enable Past Due Notice"
            description="Send a notice immediately when an invoice becomes overdue."
            checked={v.pastDueNotice}
            onChange={(c) => set("pastDueNotice", c)}
            border
          />
          <SwitchRow
            title="Enable Past Due Reminder"
            description="Send follow-up reminders after the due date has passed."
            checked={v.pastDueReminder}
            onChange={(c) => set("pastDueReminder", c)}
          />
          <DaysBox
            id="pastDueReminderDays"
            label="Days After Due Date"
            value={v.pastDueReminderDays}
            options={PAST_DUE_REMINDER_OPTIONS}
            suffix=""
            disabled={!v.pastDueReminder}
            onChange={(n) => set("pastDueReminderDays", n)}
          />
        </Panel>

        <InvoiceTemplateCard {...templateProps(form, "invoice")} title="Invoice Email Template" icon={Mail} iconClass="bg-[#eff6ff] text-[#3b82f6]" />
        <InvoiceTemplateCard {...templateProps(form, "invoice_receipt")} title="Invoice Receipt Template" icon={ReceiptText} iconClass={teal} />
        <InvoiceTemplateCard {...templateProps(form, "invoice_reminder")} title="Invoice Reminder Template" icon={ReceiptText} iconClass={teal} />
        <InvoiceTemplateCard {...templateProps(form, "past_due_notice")} title="Past Due Notice Template" icon={ReceiptText} iconClass={teal} />
        <InvoiceTemplateCard {...templateProps(form, "past_due_reminder")} title="Past Due Reminder Template" icon={ReceiptText} iconClass={teal} />

        <CardFooter pending={form.pending} dirty={form.dirty} onCancel={form.cancel} status={form.status} className="" />
      </form>
    </SettingsCard>
  );
}
