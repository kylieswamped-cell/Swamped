"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useLocalTime } from "@/components/jobs/format";
import { deleteRefund, sendRefundReceiptEmail, updateRefund } from "@/lib/payments/actions";
import { REFUND_METHODS, type PaymentDetail, type PaymentRefund } from "@/lib/payments/data";
import { formatMoney } from "@/lib/quotes/totals";
import { dayLabel, DeleteLedgerDialog, EditLedgerModal } from "./LedgerModals";
import PaymentDetailHeader, { MenuItem, useMenu } from "./PaymentDetailHeader";
import { paymentStatusLabel } from "./PaymentStatusBadge";

const card = "rounded-xl border border-[#e4e4e7] bg-white p-[19px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]";
const cardLabel = "text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-[#71717a]";
const panel = "overflow-hidden rounded-xl border border-[#e4e4e7] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]";
const panelHead = "flex h-[52px] items-center justify-between border-b border-[#e4e4e7] bg-[rgba(250,250,250,0.5)] px-6 text-[14px] font-bold leading-5 text-[#27272a]";
const th = "pl-6 text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.55px] text-[#71717a]";
const detailLabel = "text-[10px] font-bold uppercase leading-5 text-[#a1a1aa]";

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Copyable({ value, red = false }: { value: string; red?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className={`truncate text-[12px] leading-4 ${red ? "text-[rgba(185,28,28,0.6)]" : "text-[#52525b]"}`} title={value}>{value}</span>
      <button
        type="button"
        aria-label="Copy"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded p-0.5 hover:bg-[#f4f4f5] print:hidden"
      >
        <Image src={red ? "/payments/copy-red.svg" : "/payments/copy.svg"} alt="" width={12} height={12} />
      </button>
      {copied && <span className="text-[10px] text-[#059669]">Copied</span>}
    </span>
  );
}

/** A related record chip: "#Q-882 | $1,450" in the record's colour. */
function RecordChip({ href, label, detail, tone }: { href: string; label: string; detail: string; tone: string }) {
  return (
    <Link href={href} className={`flex h-[26.5px] max-w-full items-center gap-1 rounded border px-[7px] text-[11px] font-medium leading-[16.5px] transition-opacity hover:opacity-80 ${tone}`}>
      <span className="shrink-0">#{label}</span>
      <span className="opacity-40">|</span>
      <span className="truncate">{detail}</span>
    </Link>
  );
}

function RefundActions({ refund, payment, onMessage }: { refund: PaymentRefund; payment: PaymentDetail; onMessage: (m: { error?: string; notice?: string }) => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen, menuRef] = useMenu();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const choose = (d: "edit" | "delete") => {
    setMenuOpen(false);
    setError(undefined);
    onMessage({});
    setDialog(d);
  };

  const resend = () => {
    setMenuOpen(false);
    onMessage({});
    startTransition(async () => {
      const result = await sendRefundReceiptEmail(refund.id);
      onMessage(result.error ? { error: result.error } : { notice: `Refund receipt sent to ${result.sentTo}.` });
      if (!result.error) router.refresh();
    });
  };

  const lastSent = refund.receiptSentAt ? `Last sent ${dayLabel(refund.receiptSentAt.slice(0, 10))}` : "Not sent yet";

  return (
    <div ref={menuRef} className="relative inline-block print:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={pending}
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex h-[34px] items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-3 text-[14px] font-medium leading-5 text-[#334155] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#f8fafc] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Actions"}
        <Image src="/payments/actions-chevron-sm.svg" alt="" width={10} height={10} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>
      {menuOpen && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 overflow-hidden rounded-lg border border-[#e2e8f0] bg-white py-1 text-left shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
          <p className="bg-[rgba(248,250,252,0.5)] px-3 py-1.5 text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#94a3b8]">Accounting</p>
          <MenuItem icon="edit-square" label="Edit Refund" onClick={() => choose("edit")} />
          <div className="mx-auto h-px w-[206px] bg-[#f1f5f9]" />
          <MenuItem
            icon="resend"
            label={refund.receiptSentAt ? "Resend Refund Receipt" : "Send Refund Receipt"}
            sub={lastSent}
            disabled={payment.customer?.email ? undefined : "The customer has no email address"}
            onClick={resend}
          />
          <MenuItem
            icon="pdf"
            label="Download Receipt PDF"
            onClick={() => {
              setMenuOpen(false);
              window.print();
            }}
          />
          <div className="mx-auto h-px w-[206px] bg-[#f1f5f9]" />
          <MenuItem icon="trash-sm" label="Delete Refund" sub="Reverts history & reporting" tone="text-[#dc2626]" onClick={() => choose("delete")} />
        </div>
      )}

      {dialog === "edit" && (
        <EditLedgerModal
          title="Edit Manual Refund"
          subtitle={`${refund.number} on payment #${payment.number}`}
          what="Refund"
          methods={REFUND_METHODS}
          initial={{ method: refund.method, date: refund.refundedOn, reference: refund.reference ?? "", amount: refund.amount, note: refund.note ?? "" }}
          hint={`Up to ${formatMoney(payment.net + refund.amount)} can be refunded on this payment.`}
          onClose={() => setDialog(null)}
          onSave={async (input) => {
            const result = await updateRefund(refund.id, input);
            if (!result.error && !result.fieldErrors) router.refresh();
            return result;
          }}
        />
      )}
      <DeleteLedgerDialog
        open={dialog === "delete"}
        what="refund"
        busy={pending}
        error={error}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteRefund(refund.id);
            if (result.error) return setError(result.error);
            setDialog(null);
            router.refresh();
          })
        }
      />
    </div>
  );
}

type Event = { at: string; title: string; body: ReactNode; dot: string; ring: string };

function activity(p: PaymentDetail): Event[] {
  const source = p.kind === "deposit" ? `Quote #${p.quote?.number}` : `Invoice #${p.invoice?.number}`;
  const events: Event[] = [
    {
      at: p.createdAt,
      title: p.kind === "deposit" ? "Deposit Recorded" : "Payment Created",
      body: (
        <>
          {p.kind === "deposit" ? "Deposit " : "Payment "}
          <strong className="font-bold text-[#18181b]">#{p.number}</strong> of {formatMoney(p.amount)} recorded by {p.method} for {source}.
        </>
      ),
      dot: "bg-[#18181b]",
      ring: "shadow-[0_0_0_4px_#f4f4f5]",
    },
  ];
  if (new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime() > 60_000 && p.kind === "payment") {
    events.push({ at: p.updatedAt, title: "Payment Updated", body: "The payment details were edited.", dot: "bg-[#10b981]", ring: "shadow-[0_0_0_4px_#ecfdf5]" });
  }
  if (p.receiptSentAt && p.customer?.email) {
    events.push({
      at: p.receiptSentAt,
      title: "Receipt Sent",
      body: (
        <>
          Original transaction receipt sent to <span className="font-medium text-[#18181b]">{p.customer.email}</span>.
        </>
      ),
      dot: "bg-[#e4e4e7]",
      ring: "shadow-[0_0_0_4px_#fafafa]",
    });
  }
  for (const r of p.refunds) {
    events.push({
      at: r.createdAt,
      title: "Refund Issued",
      body: (
        <>
          {r.amount >= p.amount ? "Full" : "Partial"} refund of <strong className="font-bold text-[#dc2626]">-{formatMoney(r.amount)}</strong> recorded by {r.method}
          {r.note ? ` for ${r.note.replace(/\.$/, "").toLowerCase()}` : ""}.
        </>
      ),
      dot: "bg-[#ef4444]",
      ring: "shadow-[0_0_0_4px_#fef2f2]",
    });
    if (r.receiptSentAt) {
      events.push({
        at: r.receiptSentAt,
        title: "Refund Receipt Sent",
        body: `Refund confirmation ${r.number} sent to the customer.`,
        dot: "bg-[#3b82f6]",
        ring: "shadow-[0_0_0_4px_#eff6ff]",
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export default function PaymentDetailView({ payment }: { payment: PaymentDetail }) {
  const local = useLocalTime();
  const [message, setMessage] = useState<{ error?: string; notice?: string }>({});
  const zone = local ? undefined : "UTC";
  const dateTime = (iso: string) =>
    `${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: zone })}, ${new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone })}`;
  const relative = (iso: string) => {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone });
    if (!local) return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}, ${time}`;
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
    if (days === 0) return `Today, ${time}`;
    if (days === 1) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
  };

  const typeLabel = payment.kind === "deposit" ? "Deposit" : "Payment";
  const events = activity(payment);

  return (
    <div className="pb-12">
      <PaymentDetailHeader payment={payment} onMessage={setMessage} />

      <div className="px-4 pt-6 sm:px-12 sm:pt-[66px]">
        {(message.error || message.notice) && (
          <p role="alert" className={`mb-5 flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-[13px] ${message.error ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]" : "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]"}`}>
            {message.error ?? message.notice}
            <button type="button" onClick={() => setMessage({})} className="font-semibold opacity-70 hover:opacity-100">Dismiss</button>
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={card}>
            <p className={cardLabel}>{typeLabel} Amount</p>
            <p className="mt-[15px] text-[24px] font-bold leading-8 text-[#18181b]">{formatMoney(payment.amount)}</p>
            <p className="flex items-center gap-1 text-[12px] leading-4 text-[#71717a]">
              <Image src="/payments/globe.svg" alt="" width={12} height={12} />
              Currency: USD
            </p>
          </div>

          <div className={card}>
            <p className={cardLabel}>Customer</p>
            {payment.customer ? (
              <Link href={`/customers/${payment.customer.id}`} className="group mt-[11px] flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#f4f4f5] bg-[#dbeafe] text-[13px] font-bold text-[#2563eb]">{initials(payment.customer.name)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-bold leading-[14px] text-[#18181b] group-hover:text-[#00c185]">{payment.customer.name}</span>
                  <span className="mt-1 block truncate text-[12px] leading-4 text-[#71717a]">{payment.customer.email ?? "No email"}</span>
                </span>
              </Link>
            ) : (
              <p className="mt-3 text-[14px] text-[#71717a]">—</p>
            )}
          </div>

          <div className={card}>
            <p className={cardLabel}>Related Records</p>
            <div className="mt-[11px] flex flex-wrap gap-2">
              {payment.quote && (
                <RecordChip href={`/quotes/${payment.quote.id}`} label={payment.quote.number} detail={formatMoney(payment.quote.total)} tone="border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]" />
              )}
              {payment.invoice && (
                <RecordChip
                  href={`/invoices/${payment.invoice.id}`}
                  label={payment.invoice.number}
                  detail={payment.invoice.balance > 0 ? `${formatMoney(payment.invoice.balance)} due` : "Paid"}
                  tone="border-[#fef3c7] bg-[#fffbeb] text-[#b45309]"
                />
              )}
              {payment.job && <RecordChip href={`/jobs/${payment.job.id}`} label={payment.job.number} detail={payment.job.title} tone="border-[#d1fae5] bg-[#ecfdf5] text-[#047857]" />}
              {!payment.quote && !payment.invoice && !payment.job && <p className="text-[14px] text-[#71717a]">None</p>}
            </div>
          </div>

          <div className={card}>
            <p className={cardLabel}>Current Status</p>
            <span className="mt-[15px] inline-flex h-6 items-center rounded-full border border-[#059669] bg-[rgba(0,193,133,0.1)] px-[11px] text-[12px] font-bold uppercase leading-4 tracking-[-0.3px] text-[#00c185]">
              {paymentStatusLabel(payment.status)}
            </span>
            <p className="mt-1 text-[11px] leading-[16.5px] text-[#71717a]">Last updated {relative(payment.updatedAt)}</p>
          </div>
        </div>

        <section className={`mt-6 ${panel}`}>
          <h3 className={panelHead}>Transaction Information</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed text-left">
              <colgroup>
                {["w-[17%]", "w-[22.5%]", "w-[12.2%]", "w-[13.4%]", "w-[13%]", "w-[21.9%]"].map((c, i) => (
                  <col key={i} className={c} />
                ))}
              </colgroup>
              <thead className="whitespace-nowrap bg-[#fafafa]">
                <tr className="h-[41px] border-b border-[#e4e4e7]">
                  <th className={th}>Transaction ID</th>
                  <th className={th}>Date &amp; Time</th>
                  <th className={th}>Type</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Net</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="text-[14px] leading-5">
                <tr className="h-[73px]">
                  <td className="pl-6 font-medium text-[#18181b]">{payment.number}</td>
                  <td className="pl-6 text-[#52525b]">{payment.kind === "deposit" ? dayLabel(payment.paidOn) : dateTime(payment.createdAt)}</td>
                  <td className="pl-6">
                    <p className="font-medium text-[#18181b]">{typeLabel}</p>
                    <p className="text-[11px] text-[#a1a1aa]">Manual</p>
                  </td>
                  <td className="pl-6 font-semibold text-[#18181b]">{formatMoney(payment.amount)}</td>
                  <td className="pl-6 text-[#52525b]">{formatMoney(payment.amount)}</td>
                  <td className="pl-6">
                    <span className="flex items-center gap-1.5 font-medium text-[#059669]">
                      <Image src="/payments/status-success.svg" alt="" width={10} height={10} />
                      Successful
                    </span>
                  </td>
                </tr>
                <tr className="border-t border-[#e4e4e7] bg-[rgba(250,250,250,0.3)]">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="grid grid-cols-3 gap-8">
                      <div className="min-w-0">
                        <p className={detailLabel}>Reference</p>
                        {payment.reference ? <Copyable value={payment.reference} /> : <p className="text-[12px] leading-4 text-[#52525b]">—</p>}
                      </div>
                      <div className="min-w-0">
                        <p className={detailLabel}>Payment Method</p>
                        <p className="flex items-center gap-1 text-[12px] leading-4 text-[#52525b]">
                          <Image src="/payments/bank.svg" alt="" width={10} height={10} />
                          {payment.method} · Paid on {dayLabel(payment.paidOn)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className={detailLabel}>Internal Note</p>
                        <p className="truncate text-[12px] leading-4 text-[#52525b]" title={payment.note ?? undefined}>{payment.note ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                </tr>
                {payment.refunds.map((r) => (
                  <RefundRows key={r.id} refund={r} dateTime={dateTime} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`mt-6 ${panel}`}>
          <h3 className={panelHead}>
            Refund History
            {payment.refunded > 0 && <span className="text-[12px] font-medium text-[#71717a]">Net {formatMoney(payment.net)}</span>}
          </h3>
          {payment.refunds.length === 0 ? (
            <p className="px-6 py-8 text-center text-[14px] text-[#71717a]">No refunds have been recorded for this {payment.kind}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] table-fixed text-left">
                <colgroup>
                  {["w-[18.5%]", "w-[15.6%]", "w-[16.2%]", "w-[33%]", "w-[16.7%]"].map((c, i) => (
                    <col key={i} className={c} />
                  ))}
                </colgroup>
                <thead className="whitespace-nowrap bg-[#fafafa]">
                  <tr className="h-[41px] border-b border-[#e4e4e7]">
                    <th className={th}>Refund Date</th>
                    <th className={`${th} pr-6 text-right`}>Amount</th>
                    <th className={th}>Method</th>
                    <th className={th}>Reason</th>
                    <th className="pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[14px] leading-5">
                  {payment.refunds.map((r) => (
                    <tr key={r.id} className="h-[61px] border-b border-[#f4f4f5] last:border-b-0">
                      <td className="pl-6 text-[#18181b]">{dayLabel(r.refundedOn)}</td>
                      <td className="pr-6 text-right font-bold text-[#dc2626]">-{formatMoney(r.amount)}</td>
                      <td className="pl-6">
                        <span className="flex items-center gap-2 text-[#52525b]">
                          <span className="flex items-center gap-1 rounded border border-[#fde68a] bg-[#fffbeb] px-2 py-0.5 text-[11px] font-medium leading-[16.5px] text-[#b45309]">
                            <Image src="/payments/manual-hand.svg" alt="" width={12.38} height={11} />
                            Manual
                          </span>
                          <span className="truncate">{r.method}</span>
                        </span>
                      </td>
                      <td className="truncate pl-6 text-[#52525b]" title={r.note ?? undefined}>{r.note ?? "—"}</td>
                      <td className="pr-6 text-right">
                        <RefundActions refund={r} payment={payment} onMessage={setMessage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`mt-6 ${panel}`}>
          <h3 className={`${panelHead} bg-[rgba(250,250,250,0.5)]`}>Payment Activity</h3>
          <ol className="relative px-6 py-6">
            <span aria-hidden className="absolute bottom-10 left-[31px] top-8 border-l border-[#e4e4e7]" />
            {events.map((e, i) => (
              <li key={`${e.title}-${i}`} className={`relative flex gap-4 ${i ? "mt-8" : ""}`}>
                <span className={`relative mt-1 size-4 shrink-0 rounded-full ${e.dot} ${e.ring}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="text-[12px] font-bold leading-4 text-[#18181b]">{e.title}</p>
                    <p className="text-[10px] leading-[15px] text-[#a1a1aa]">{relative(e.at)}</p>
                  </div>
                  <p className="mt-1 text-[12px] leading-[19.5px] text-[#52525b]">{e.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function RefundRows({ refund, dateTime }: { refund: PaymentRefund; dateTime: (iso: string) => string }) {
  return (
    <>
      <tr className="h-[73px] border-t border-[#e4e4e7] bg-white">
        <td className="pl-6 font-medium text-[#18181b]">{refund.number}</td>
        <td className="pl-6 text-[#52525b]">{dateTime(refund.createdAt)}</td>
        <td className="pl-6">
          <p className="font-medium text-[#18181b]">Refund</p>
          <p className="text-[11px] text-[#a1a1aa]">Manual</p>
        </td>
        <td className="pl-6 font-semibold text-[#dc2626]">-{formatMoney(refund.amount)}</td>
        <td className="pl-6 text-[#dc2626]">-{formatMoney(refund.amount)}</td>
        <td className="pl-6">
          <span className="flex items-center gap-1.5 font-medium text-[#52525b]">
            <Image src="/payments/status-done.svg" alt="" width={10} height={10} />
            Succeeded
          </span>
        </td>
      </tr>
      <tr className="border-t border-[#e4e4e7] bg-[rgba(254,242,242,0.2)]">
        <td colSpan={6} className="px-6 py-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="min-w-0">
              <p className={detailLabel}>Refund Reference</p>
              {refund.reference ? <Copyable value={refund.reference} red /> : <p className="text-[12px] leading-4 text-[rgba(185,28,28,0.6)]">—</p>}
            </div>
            <div className="min-w-0">
              <p className={detailLabel}>Refund Reason</p>
              <p className="truncate text-[12px] italic leading-4 text-[#3f3f46]" title={refund.note ?? undefined}>
                {refund.note ? `"${refund.note}"` : `${refund.method} refund on ${dayLabel(refund.refundedOn)}`}
              </p>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
