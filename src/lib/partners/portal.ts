import { siteOrigin } from "@/lib/siteOrigin";
import type { Partner } from "./server";

/** The link partners share: sign-up with their code, e.g. https://…/signup?ref=alex-3f9c2. */
export async function referralUrl(partner: Partner) {
  return `${await siteOrigin()}/signup?ref=${partner.referralCode}`;
}

/** The ready-to-paste message from the Referral Link design (Figma 926:1187). */
export const shareMessage = (url: string) =>
  `Swamped is a free platform for contractors and small businesses that helps manage customers, jobs, quotes, invoices, deposits, and payments in one simple place, without the complexity or monthly software fees that come with many business management systems. If you're looking for a straightforward way to send professional quotes and invoices, collect deposits and online payments, and keep your work organized, you can learn more and create a free account here: ${url}`;
