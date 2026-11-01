// From the "Partner Type Dropdown Component" in Figma (896:1905).
export const PARTNER_TYPES = [
  { value: "contractor", label: "Contractor / Home Service Business" },
  { value: "content-creator", label: "Content Creator" },
  { value: "marketing-agency", label: "Marketing Agency" },
  { value: "business-consultant", label: "Business Consultant" },
  { value: "industry-influencer", label: "Industry Influencer" },
  { value: "community-owner", label: "Community Owner / Group Admin" },
  { value: "software-company", label: "Software / Technology Company" },
  { value: "other", label: "Other" },
] as const;

export type PartnerStatus = "pending" | "approved" | "declined";

export type PartnerApplication = {
  id: string;
  status: PartnerStatus;
  partnerType: string;
  createdAt: string;
};
