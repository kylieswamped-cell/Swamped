// Customer email templates edited in Settings. Shared by the settings form and
// the server code that drafts and sends emails.

export type TemplateKey =
  | "quote"
  | "deposit"
  | "invoice"
  | "invoice_receipt"
  | "invoice_reminder"
  | "past_due_notice"
  | "past_due_reminder"
  | "refund";

export type EmailTemplate = { subject: string; body: string };
export type EmailTemplates = Record<TemplateKey, EmailTemplate>;

export const DEFAULT_TEMPLATES: EmailTemplates = {
  quote: {
    subject: "New Quote Proposal from {{company_name}} - #{{quote_number}}",
    body: "Hi {{customer_name}},\n\nPlease find the attached quote for your upcoming project. You can review the details below and reply to this email to accept the proposal or ask any questions.\n\nBest regards,\n{{sender_name}}",
  },
  deposit: {
    subject: "Deposit Received for Quote #{{quote_number}}",
    body: "Hello {{customer_name}},\n\nThank you for your payment. We have successfully received your deposit for quote #{{quote_number}}. We are now moving forward with your project and will keep you updated on the progress.\n\nTransaction ID: {{transaction_id}}\n\nThank you,\nThe {{company_name}} Team",
  },
  invoice: {
    subject: "New Invoice {{Invoice Number}} from {{Business Name}}",
    body: "Hi {{Customer First Name}},\n\nThank you for your business. Please find attached your invoice {{Invoice Number}} for the amount of {{Invoice Total}}.\n\nPayment is due by {{Due Date}}.\n\nBest regards,\n{{Business Name}}",
  },
  invoice_receipt: {
    subject: "Payment Receipt for Invoice {{Invoice Number}}",
    body: "Hi {{Customer First Name}},\n\nThis email confirms we have received your payment of {{Payment Amount}} on {{Payment Date}} for invoice {{Invoice Number}}. Your receipt details are below for your records.\n\nThank you,\n{{Business Name}}",
  },
  invoice_reminder: {
    subject: "Reminder: Invoice {{Invoice Number}} is due soon",
    body: "Hi {{Customer First Name}},\n\nThis is a friendly reminder that invoice {{Invoice Number}} for {{Invoice Total}} is due on {{Due Date}}.\n\nIf you've already sent payment, please disregard this message.\n\nThank you,\n{{Business Name}}",
  },
  past_due_notice: {
    subject: "URGENT: Invoice {{Invoice Number}} is now past due",
    body: "Hi {{Customer First Name}},\n\nInvoice {{Invoice Number}} for {{Invoice Total}} was due on {{Due Date}} and is now past due. Please arrange payment at your earliest convenience.\n\nIf you've already sent payment, please disregard this message.\n\nThank you,\n{{Business Name}}",
  },
  past_due_reminder: {
    subject: "Final Reminder: Invoice {{Invoice Number}} is {{Days Overdue}} days past due",
    body: "Hi {{Customer First Name}},\n\nInvoice {{Invoice Number}} for {{Invoice Total}} is now {{Days Overdue}} days past due. Please arrange payment as soon as possible, or reply to this email if you have any questions.\n\nThank you,\n{{Business Name}}",
  },
  refund: {
    subject: "Your refund from {{Business Name}} has been processed",
    body: "Hi {{Customer First Name}},\n\nThis email confirms that we have processed a refund of {{Refund Amount}} for your original payment of {{Original Payment Amount}}. The funds should appear in your account within 5-10 business days depending on your bank.\n\nBest regards,\nThe {{Business Name}} Team",
  },
};

export const TEMPLATE_KEYS = Object.keys(DEFAULT_TEMPLATES) as TemplateKey[];

/** Merge fields offered in each template's field library. */
export const TEMPLATE_FIELDS: Record<TemplateKey, string[]> = {
  quote: ["Customer First Name", "Business Name", "Quote Number"],
  deposit: ["Customer First Name", "Business Name", "Quote Number"],
  invoice: ["Customer First Name", "Business Name", "Invoice Number", "Invoice Total", "Due Date"],
  invoice_receipt: ["Customer First Name", "Business Name", "Invoice Number", "Payment Amount", "Payment Date"],
  invoice_reminder: ["Customer First Name", "Business Name", "Invoice Number", "Invoice Total", "Due Date"],
  past_due_notice: ["Customer First Name", "Business Name", "Invoice Number", "Invoice Total", "Due Date"],
  past_due_reminder: ["Customer First Name", "Business Name", "Invoice Number", "Invoice Total", "Due Date", "Days Overdue"],
  refund: ["Customer First Name", "Refund Amount", "Original Payment Amount", "Business Name"],
};

/** A saved templates column merged over the defaults; ignores anything malformed. */
export function resolveTemplates(saved: unknown): EmailTemplates {
  const out = { ...DEFAULT_TEMPLATES };
  if (!saved || typeof saved !== "object") return out;
  for (const key of TEMPLATE_KEYS) {
    const t = (saved as Record<string, unknown>)[key] as Partial<EmailTemplate> | undefined;
    if (t && typeof t.subject === "string" && typeof t.body === "string") out[key] = { subject: t.subject, body: t.body };
  }
  return out;
}

export type MergeValues = Partial<{
  customerFirstName: string;
  customerName: string;
  businessName: string;
  senderName: string;
  quoteNumber: string;
  invoiceNumber: string;
  invoiceTotal: string;
  dueDate: string;
  paymentAmount: string;
  paymentDate: string;
  transactionId: string;
  refundAmount: string;
  originalPaymentAmount: string;
  daysOverdue: string;
}>;

// Field names are matched loosely, so "{{Customer First Name}}",
// "{{customer_first_name}}" and "{Customer First Name}" all work.
const FIELD_ALIASES: Record<string, keyof MergeValues> = {
  customerfirstname: "customerFirstName",
  firstname: "customerFirstName",
  customername: "customerName",
  businessname: "businessName",
  companyname: "businessName",
  sendername: "senderName",
  quotenumber: "quoteNumber",
  invoicenumber: "invoiceNumber",
  invoicetotal: "invoiceTotal",
  duedate: "dueDate",
  paymentamount: "paymentAmount",
  paymentdate: "paymentDate",
  transactionid: "transactionId",
  refundamount: "refundAmount",
  originalpaymentamount: "originalPaymentAmount",
  daysoverdue: "daysOverdue",
};

const FIELD_RE = /\{\{\s*([^{}]+?)\s*\}\}|\{\s*([^{}]+?)\s*\}/g;

/** Fills a template's merge fields. Unknown fields are left as typed. */
export function fillTemplate(text: string, values: MergeValues) {
  return text.replace(FIELD_RE, (match, a: string | undefined, b: string | undefined) => {
    const key = FIELD_ALIASES[(a ?? b ?? "").toLowerCase().replace(/[^a-z]/g, "")];
    const value = key ? values[key] : undefined;
    return value ?? match;
  });
}

export function renderTemplate(template: EmailTemplate, values: MergeValues): EmailTemplate {
  return { subject: fillTemplate(template.subject, values).slice(0, 200), body: fillTemplate(template.body, values) };
}

/** A profile's saved template (or the default), with its merge fields filled. */
export function profileTemplate(saved: unknown, key: TemplateKey, values: MergeValues): EmailTemplate {
  return renderTemplate(resolveTemplates(saved)[key], values);
}

export const firstNameOf = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || "there";
