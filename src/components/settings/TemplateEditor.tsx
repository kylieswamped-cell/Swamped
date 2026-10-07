"use client";

import { Plus, RotateCcw, Save } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import { saveEmailTemplate } from "@/lib/settings/actions";
import { DEFAULT_TEMPLATES, TEMPLATE_FIELDS, type EmailTemplate, type TemplateKey } from "@/lib/settings/templates";
import { FieldError, StatusLine, type Status } from "./ui";

type Format = "bold" | "italic" | "underline" | "link";

// The email formatter understands **bold**, _italic_, ++underline++ and [text](url).
const MARKS: Record<Exclude<Format, "link">, string> = { bold: "**", italic: "_", underline: "++" };

/** Inserts merge fields at the cursor and wraps the body selection in formatting. */
function useTemplateEditing(value: EmailTemplate, onChange: (t: EmailTemplate) => void) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");
  const caret = useRef<{ field: "subject" | "body"; start: number; end: number } | null>(null);

  // Restore the selection after React re-renders the controlled field.
  useEffect(() => {
    const c = caret.current;
    if (!c) return;
    const el = c.field === "subject" ? subjectRef.current : bodyRef.current;
    el?.focus();
    el?.setSelectionRange(c.start, c.end);
    caret.current = null;
  });

  function replaceRange(field: "subject" | "body", build: (selected: string) => { text: string; select: [number, number] }) {
    const el = field === "subject" ? subjectRef.current : bodyRef.current;
    const current = value[field];
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const { text, select } = build(current.slice(start, end));
    onChange({ ...value, [field]: current.slice(0, start) + text + current.slice(end) });
    caret.current = { field, start: start + select[0], end: start + select[1] };
  }

  function insertField(label: string) {
    const token = `{{${label}}}`;
    replaceRange(lastFocused.current, () => ({ text: token, select: [token.length, token.length] }));
  }

  function format(kind: Format) {
    replaceRange("body", (selected) => {
      if (kind === "link") {
        const label = selected || "link text";
        const text = `[${label}](https://)`;
        // Leave the cursor where the address goes.
        return { text, select: [label.length + 3 + 8, label.length + 3 + 8] };
      }
      const mark = MARKS[kind];
      const inner = selected || kind;
      return { text: `${mark}${inner}${mark}`, select: [mark.length, mark.length + inner.length] };
    });
  }

  const onSubjectFocus = () => {
    lastFocused.current = "subject";
  };
  const onBodyFocus = () => {
    lastFocused.current = "body";
  };

  return { subjectRef, bodyRef, insertField, format, onSubjectFocus, onBodyFocus };
}

/** Saving one template from its own Save button. */
function useTemplateSave(templateKey: TemplateKey, value: EmailTemplate, onSaved: (saved: EmailTemplate) => void) {
  const [pending, startTransition] = useTransition();
  // The status only shows while the text is still what was saved (or failed).
  const [result, setResult] = useState<{ status: Status; errors: Record<string, string>; for: string } | null>(null);
  const current = JSON.stringify(value);
  const fresh = result?.for === current ? result : null;

  function save() {
    const snapshot = current;
    const saving = value;
    startTransition(async () => {
      const r = await saveEmailTemplate(templateKey, value);
      const failed = Boolean(r.error || r.fieldErrors);
      setResult({
        for: snapshot,
        errors: r.fieldErrors ?? {},
        status: failed ? { error: r.error ?? "Please fix the highlighted fields." } : { notice: r.notice ?? "Template saved." },
      });
      if (!failed) onSaved(saving);
    });
  }
  return { pending, status: fresh?.status ?? null, errors: fresh?.errors ?? {}, save };
}

type TemplateCardProps = {
  templateKey: TemplateKey;
  title: string;
  value: EmailTemplate;
  onChange: (t: EmailTemplate) => void;
  /** Errors from the section's Save Changes, keyed "<template>.subject" / "<template>.body". */
  errors: Record<string, string>;
  onSaved: (saved: EmailTemplate) => void;
};

const formatButtons: { kind: Format; label: string; text: ReactNode; icon: string; w: number }[] = [
  { kind: "bold", label: "Bold", text: <span className="font-bold">B</span>, icon: "/settings/fmt-bold.svg", w: 9 },
  { kind: "italic", label: "Italic", text: <span className="italic">I</span>, icon: "/settings/fmt-italic.svg", w: 9 },
  { kind: "underline", label: "Underline", text: <span className="underline">U</span>, icon: "/settings/fmt-underline.svg", w: 10.5 },
];

function Toolbar({ onFormat, icons }: { onFormat: (k: Format) => void; icons?: boolean }) {
  const btn = icons ? "size-8" : "size-7";
  return (
    <div
      className={`flex items-center border-b border-[#e2e8f0] bg-[#f8fafc] ${icons ? "gap-1 p-2" : "h-11 gap-2 px-3"}`}
      role="toolbar"
      aria-label="Formatting"
    >
      {formatButtons.map((b) => (
        <button
          key={b.kind}
          type="button"
          title={b.label}
          aria-label={b.label}
          // Keep the textarea's selection when clicking a button.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFormat(b.kind)}
          className={`flex items-center justify-center rounded text-[14px] text-[#64748b] transition-colors hover:bg-[#e2e8f0] ${btn}`}
        >
          {icons ? <Image src={b.icon} alt="" width={b.w} height={12} /> : b.text}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-[#cbd5e1]" />
      <button
        type="button"
        title="Insert link"
        aria-label="Insert link"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormat("link")}
        className={`flex items-center justify-center rounded transition-colors hover:bg-[#e2e8f0] ${btn}`}
      >
        <Image src="/settings/fmt-link.svg" alt="" width={15} height={12} />
      </button>
    </div>
  );
}

const quoteInput =
  "w-full rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[14px] leading-5 text-[#1e293b] outline-none transition-colors focus:border-[#10b981] aria-invalid:border-[#ef4444]";

/** Template card in Quote Configuration: field chips, subject, body. */
export function QuoteTemplateCard({
  templateKey,
  title,
  icon,
  value,
  onChange,
  errors,
  onSaved,
}: TemplateCardProps & { icon: { src: string; w: number; h: number } }) {
  const { subjectRef, bodyRef, insertField, onSubjectFocus, onBodyFocus } = useTemplateEditing(value, onChange);
  const own = useTemplateSave(templateKey, value, onSaved);
  const err = (f: "subject" | "body") => own.errors[`${templateKey}.${f}`] ?? errors[`${templateKey}.${f}`];
  const id = `tpl-${templateKey}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <Image src={icon.src} alt="" width={icon.w} height={icon.h} />
          <h4 className="text-[16px] font-semibold leading-6 tracking-[-0.4px] text-[#0f172a]">{title}</h4>
        </div>
        <span className="rounded bg-[#f8fafc] px-2 pb-[6.5px] pt-[10.5px] text-[10px] font-bold uppercase leading-[15px] text-[#94a3b8]">
          System Email
        </span>
      </div>
      <div className="flex flex-col gap-6 rounded-[16px] border border-[#f1f5f9] bg-white p-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:p-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#f8fafc] pb-4">
          <span className="text-[12px] font-semibold uppercase leading-4 tracking-[0.3px] text-[#64748b]">➕ Custom Field Library</span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_FIELDS[templateKey].map((f) => (
              <button
                key={f}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertField(f)}
                className="rounded border border-[#e2e8f0] bg-[#f1f5f9] px-2 py-1 text-[10px] font-medium leading-[15px] text-[#475569] transition-colors hover:border-[#10b981] hover:text-[#059669]"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-subject`} className="text-[12px] font-semibold leading-[18px] text-[#64748b]">
            Subject Line
          </label>
          <input
            ref={subjectRef}
            id={`${id}-subject`}
            value={value.subject}
            maxLength={200}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
            aria-invalid={err("subject") ? true : undefined}
            className={quoteInput}
            onFocus={onSubjectFocus}
          />
          <FieldError id={`${id}-subject-error`} message={err("subject")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-body`} className="text-[12px] font-semibold leading-[18px] text-[#64748b]">
            Email Body Text
          </label>
          <textarea
            ref={bodyRef}
            id={`${id}-body`}
            value={value.body}
            maxLength={5000}
            rows={5}
            onChange={(e) => onChange({ ...value, body: e.target.value })}
            aria-invalid={err("body") ? true : undefined}
            className={`${quoteInput} min-h-[160px] resize-y py-[14px] leading-[22.75px] text-[#475569]`}
            onFocus={onBodyFocus}
          />
          <FieldError id={`${id}-body-error`} message={err("body")} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <StatusLine status={own.status} className="mr-auto text-[13px]" />
          <button
            type="button"
            onClick={() => onChange(DEFAULT_TEMPLATES[templateKey])}
            className="rounded-[8px] border border-[#f1f5f9] px-4 py-2 text-[12px] font-semibold leading-4 text-[#94a3b8] transition-colors hover:border-[#e2e8f0] hover:text-[#64748b]"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={own.save}
            disabled={own.pending}
            className="rounded-[8px] bg-[#10b981] px-6 pb-[9.5px] pt-[8.5px] text-[12px] font-bold leading-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#059669] disabled:opacity-60"
          >
            {own.pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const invoiceInput =
  "h-11 w-full rounded-[12px] border border-[#e2e8f0] bg-white px-3 text-[14px] leading-5 text-[#0f172a] outline-none transition-colors focus:border-[#10b981] aria-invalid:border-[#ef4444]";

/** Merge Field Library button with a menu of fields to insert. */
function MergeFieldMenu({ fields, onPick }: { fields: string[]; onPick: (f: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-2 rounded-[8px] border border-[#d1fae5] bg-[#ecfdf5] px-3 text-[14px] font-medium leading-5 text-[#059669] transition-colors hover:bg-[#d1fae5]"
      >
        <Plus className="size-3" strokeWidth={3} />
        Merge Field Library
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-10 z-20 w-56 rounded-xl border border-[#e2e8f0] bg-white p-1.5 shadow-lg">
          {fields.map((f) => (
            <button
              key={f}
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(f);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#334155] hover:bg-[#f8fafc]"
            >
              {`{{${f}}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Template card in Invoice Configuration: tinted icon header, rich text body, Save Template footer. */
export function InvoiceTemplateCard({
  templateKey,
  title,
  icon: Icon,
  iconClass,
  value,
  onChange,
  errors,
  onSaved,
}: TemplateCardProps & { icon: ComponentType<{ className?: string }>; iconClass: string }) {
  const { subjectRef, bodyRef, insertField, format, onSubjectFocus, onBodyFocus } = useTemplateEditing(value, onChange);
  const own = useTemplateSave(templateKey, value, onSaved);
  const err = (f: "subject" | "body") => own.errors[`${templateKey}.${f}`] ?? errors[`${templateKey}.${f}`];
  const id = `tpl-${templateKey}`;

  return (
    <section className="rounded-[16px] border border-[#f1f5f9] bg-white shadow-[0_0_20px_rgba(0,0,0,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-[16px] border-b border-[#f1f5f9] bg-[rgba(248,250,252,0.5)] px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className={`flex size-8 items-center justify-center rounded-[8px] ${iconClass}`}>
            <Icon className="size-4" />
          </span>
          <h4 className="text-[18px] font-semibold leading-7 text-[#0f172a]">{title}</h4>
        </div>
        <MergeFieldMenu fields={TEMPLATE_FIELDS[templateKey]} onPick={insertField} />
      </div>
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-subject`} className="text-[14px] font-medium leading-5 text-[#334155]">
            Subject Line
          </label>
          <input
            ref={subjectRef}
            id={`${id}-subject`}
            value={value.subject}
            maxLength={200}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
            aria-invalid={err("subject") ? true : undefined}
            className={invoiceInput}
            onFocus={onSubjectFocus}
          />
          <FieldError id={`${id}-subject-error`} message={err("subject")} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-body`} className="text-[14px] font-medium leading-5 text-[#334155]">
            Email Body Text
          </label>
          <div
            className={`overflow-hidden rounded-[12px] border focus-within:border-[#10b981] ${
              err("body") ? "border-[#ef4444]" : "border-[#e2e8f0]"
            }`}
          >
            <Toolbar onFormat={format} />
            <textarea
              ref={bodyRef}
              id={`${id}-body`}
              value={value.body}
              maxLength={5000}
              rows={6}
              onChange={(e) => onChange({ ...value, body: e.target.value })}
              className="block min-h-[152px] w-full resize-y bg-white p-4 text-[14px] leading-5 text-[#0f172a] outline-none"
              onFocus={onBodyFocus}
            />
          </div>
          <FieldError id={`${id}-body-error`} message={err("body")} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 rounded-b-[16px] border-t border-[#f1f5f9] bg-[rgba(248,250,252,0.8)] px-4 py-4 sm:px-6">
        <StatusLine status={own.status} className="mr-auto text-[13px]" />
        <button
          type="button"
          onClick={() => onChange(DEFAULT_TEMPLATES[templateKey])}
          className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e2e8f0] bg-white px-4 text-[14px] font-medium text-[#475569] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f8fafc]"
        >
          <RotateCcw className="size-3" strokeWidth={2.5} />
          Reset to Default
        </button>
        <button
          type="button"
          onClick={own.save}
          disabled={own.pending}
          className="flex h-9 items-center gap-2 rounded-[8px] bg-[#10b981] px-4 text-[14px] font-medium text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#059669] disabled:opacity-60"
        >
          <Save className="size-3" strokeWidth={2.5} />
          {own.pending ? "Saving…" : "Save Template"}
        </button>
      </div>
    </section>
  );
}

/** The refund receipt editor: merge field chips, subject, and rich text body. */
export function RefundTemplateFields({
  value,
  onChange,
  errors,
}: {
  value: EmailTemplate;
  onChange: (t: EmailTemplate) => void;
  errors: Record<string, string>;
}) {
  const { subjectRef, bodyRef, insertField, format, onSubjectFocus, onBodyFocus } = useTemplateEditing(value, onChange);
  const id = "tpl-refund";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-[#64748b]">➕ Merge Field Library</span>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_FIELDS.refund.map((f) => (
            <button
              key={f}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertField(f)}
              className="rounded-[6px] border border-[rgba(226,232,240,0.6)] bg-[#f8fafc] px-3 py-1.5 text-[12px] font-medium leading-4 tracking-[-0.4px] text-[#475569] transition-colors hover:border-[#10b981] hover:text-[#059669]"
            >
              {`{{${f}}}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-[9px] pt-[3px]">
          <label htmlFor={`${id}-subject`} className="text-[14px] font-semibold leading-5 text-[#334155]">
            Subject Line
          </label>
          <input
            ref={subjectRef}
            id={`${id}-subject`}
            value={value.subject}
            maxLength={200}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
            aria-invalid={errors["refund.subject"] ? true : undefined}
            className="w-full rounded-[12px] border border-[#e2e8f0] bg-[rgba(248,250,252,0.5)] px-4 py-3 text-[13.234px] leading-5 text-[#0f172a] outline-none transition-colors focus:border-[#10b981] aria-invalid:border-[#ef4444]"
            onFocus={onSubjectFocus}
          />
          <FieldError id={`${id}-subject-error`} message={errors["refund.subject"]} />
        </div>
        <div className="flex flex-col gap-[9px] pt-[3px]">
          <label htmlFor={`${id}-body`} className="text-[14px] font-semibold leading-5 text-[#334155]">
            Email Body Text
          </label>
          <div
            className={`overflow-hidden rounded-[12px] border bg-[rgba(248,250,252,0.5)] focus-within:border-[#10b981] focus-within:shadow-[0_0_0_2px_rgba(16,185,129,0.2)] ${
              errors["refund.body"] ? "border-[#ef4444]" : "border-[#e2e8f0]"
            }`}
          >
            <Toolbar onFormat={format} icons />
            <textarea
              ref={bodyRef}
              id={`${id}-body`}
              value={value.body}
              maxLength={5000}
              rows={7}
              onChange={(e) => onChange({ ...value, body: e.target.value })}
              className="block min-h-[180px] w-full resize-y bg-transparent p-4 text-[13.234px] leading-[22.75px] text-[#0f172a] outline-none"
              onFocus={onBodyFocus}
            />
          </div>
          <FieldError id={`${id}-body-error`} message={errors["refund.body"]} />
        </div>
      </div>
    </div>
  );
}
