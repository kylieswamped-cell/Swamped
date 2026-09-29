// Quote math shared by the quote form (live preview) and the server (source of truth).

export type AmountType = "percent" | "fixed";

export type LineInput = { quantity: number; unitPrice: number; taxable: boolean };

export type Adjustments = {
  discountValue: number;
  discountType: AmountType;
  taxValue: number;
  taxType: AmountType;
  depositValue: number;
  depositType: AmountType;
};

const round = (n: number) => Math.round(n * 100) / 100;
const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function lineTotal(line: Pick<LineInput, "quantity" | "unitPrice">) {
  return round(safe(line.quantity) * safe(line.unitPrice));
}

export function quoteTotals(lines: LineInput[], adj: Adjustments) {
  const subtotal = round(lines.reduce((sum, l) => sum + lineTotal(l), 0));
  const taxableSubtotal = round(lines.filter((l) => l.taxable).reduce((sum, l) => sum + lineTotal(l), 0));

  const discount = Math.min(
    subtotal,
    round(adj.discountType === "percent" ? (subtotal * safe(adj.discountValue)) / 100 : safe(adj.discountValue)),
  );
  // A discount reduces the taxable base proportionally.
  const taxableBase = subtotal > 0 ? taxableSubtotal * (1 - discount / subtotal) : 0;
  const tax = round(adj.taxType === "percent" ? (taxableBase * safe(adj.taxValue)) / 100 : safe(adj.taxValue));
  const total = round(subtotal - discount + tax);
  const deposit = Math.min(
    total,
    round(adj.depositType === "percent" ? (total * safe(adj.depositValue)) / 100 : safe(adj.depositValue)),
  );

  return { subtotal, discount, tax, total, deposit };
}

export function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
