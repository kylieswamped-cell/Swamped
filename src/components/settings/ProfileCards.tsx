"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { uploadAttachment } from "@/components/onboarding/uploadAttachment";
import { saveBusinessProfile, savePersonalInfo, setProfileImage } from "@/lib/settings/actions";
import type { SettingsData } from "@/lib/settings/data";
import { LOGO_TYPES, MAX_LOGO_BYTES } from "@/lib/settings/options";
import { CardFooter, FieldError, FieldLabel, InputField, SettingsCard, StatusLine, ToggleRow, fieldInput, type Status } from "./ui";
import { useSettingsForm } from "./useSettingsForm";

/** Uploads a photo or logo straight to storage, then points the profile at it. */
function useImageUpload(kind: "avatar" | "logo", initialUrl: string | null) {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function pick() {
    inputRef.current?.click();
  }

  function onFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return setStatus({ error: "Choose a JPG, PNG or SVG image." });
    if (file.size > MAX_LOGO_BYTES) return setStatus({ error: "Images must be 2 MB or smaller." });
    setStatus(null);
    startTransition(async () => {
      try {
        const path = await uploadAttachment(file, "settings");
        const result = await setProfileImage(kind, path);
        if (result.error) return setStatus({ error: result.error });
        setUrl(result.url ?? URL.createObjectURL(file));
        setStatus({ notice: result.notice });
      } catch (err) {
        setStatus({ error: err instanceof Error ? err.message : "Couldn't upload the image." });
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await setProfileImage(kind, null);
      if (result.error) return setStatus({ error: result.error });
      setUrl(null);
      setStatus({ notice: result.notice });
    });
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={LOGO_TYPES.join(",")}
      className="hidden"
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  );
  return { url, status, pending, pick, remove, input };
}

function initials(first: string, last: string, email: string) {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || email[0]?.toUpperCase() || "?";
}

const personalInput =
  "h-12 w-full rounded-[12px] border border-[#e5e7eb] bg-[#f8f9fa] px-4 text-[16px] text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#10b981] focus:bg-white aria-invalid:border-[#ef4444]";
const personalLabel = "text-[#0a1b33] tracking-[0.35px]";

export function PersonalInfoCard({ data }: { data: SettingsData["personal"] }) {
  const form = useSettingsForm(
    { firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, currentPassword: "", newPassword: "", confirmPassword: "" },
    savePersonalInfo,
    // The email only changes once the new address is confirmed.
    (v) => ({ ...v, email: data.email, currentPassword: "", newPassword: "", confirmPassword: "" }),
  );
  const photo = useImageUpload("avatar", data.avatarUrl);
  const { values: v, set, errors } = form;

  const field = (name: keyof typeof v, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <InputField
      label={label}
      name={name}
      value={v[name]}
      onChange={(e) => set(name, e.target.value)}
      error={errors[name]}
      inputClass={personalInput}
      labelClass={personalLabel}
      {...props}
    />
  );

  return (
    <SettingsCard id="personal" title="Personal Information" titleClass="text-[20px] font-bold leading-7 tracking-[0.04px] text-[#0a1b33]">
      <form onSubmit={form.submit} noValidate>
        <div className="flex flex-wrap items-center gap-6">
          <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0f172a] text-[24px] font-bold text-white">
            {photo.url ? (
              // Signed storage URLs change on every load, so skip the image optimizer.
              <Image src={photo.url} alt="Your photo" fill sizes="80px" unoptimized className="object-cover" />
            ) : (
              initials(v.firstName, v.lastName, v.email)
            )}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={photo.pick}
                disabled={photo.pending}
                className="text-[14px] font-bold leading-5 text-[#00c185] transition-colors hover:text-[#059669] disabled:opacity-60"
              >
                {photo.pending ? "Uploading…" : "Change Photo"}
              </button>
              {photo.url && !photo.pending && (
                <button type="button" onClick={photo.remove} className="text-[14px] font-medium leading-5 text-[#94a3b8] hover:text-[#ef4444]">
                  Remove
                </button>
              )}
            </div>
            <StatusLine status={photo.status} className="text-[12px]" />
          </div>
          {photo.input}
        </div>

        <div className="mt-8 grid gap-x-[78px] gap-y-[26px] md:grid-cols-2">
          {field("firstName", "First Name", { autoComplete: "given-name", placeholder: "John", maxLength: 100 })}
          {field("lastName", "Last Name", { autoComplete: "family-name", placeholder: "Doe", maxLength: 100 })}
          {field("email", "Email Address", { type: "email", autoComplete: "email", placeholder: "jdoe@example.com" })}
          {field("phone", "Phone Number", { type: "tel", autoComplete: "tel", placeholder: "+1 (555) 000-0000", maxLength: 40 })}
          {field("currentPassword", "Current Password", { type: "password", autoComplete: "current-password", placeholder: "••••••••" })}
          {field("newPassword", "New Password", { type: "password", autoComplete: "new-password", placeholder: "Enter new password" })}
          {field("confirmPassword", "Confirm New Password", { type: "password", autoComplete: "new-password", placeholder: "Re-type new password" })}
        </div>

        <CardFooter pending={form.pending} dirty={form.dirty} onCancel={form.cancel} status={form.status} />
      </form>
    </SettingsCard>
  );
}

export function BusinessProfileCard({ data }: { data: SettingsData["business"] }) {
  const { logoUrl, ...initial } = data;
  const form = useSettingsForm(initial, saveBusinessProfile);
  const logo = useImageUpload("logo", logoUrl);
  const { values: v, set, errors } = form;

  const logoButton = "h-9 rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-[14px] font-semibold text-[#334155] transition-colors hover:bg-[#f8fafc] disabled:opacity-60";

  return (
    <SettingsCard id="business" title="Business Profile" subtitle="Update your public profile and contact information.">
      <form onSubmit={form.submit} noValidate className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <FieldLabel>Business Logo</FieldLabel>
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative flex size-24 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[16px] border-2 border-dashed border-[#cbd5e1] bg-[#f1f5f9]">
              {logo.url ? (
                <Image src={logo.url} alt="Business logo" fill sizes="96px" unoptimized className="object-contain p-2" />
              ) : (
                <>
                  <Image src="/settings/logo-placeholder.svg" alt="" width={24} height={24} />
                  <span className="text-[10px] font-medium leading-[15px] text-[#94a3b8]">No logo</span>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={logo.pick} disabled={logo.pending} className={logoButton}>
                  {logo.pending ? "Uploading…" : logo.url ? "Replace Logo" : "Upload Logo"}
                </button>
                {logo.url && (
                  <button type="button" onClick={logo.remove} disabled={logo.pending} className={logoButton}>
                    Remove Logo
                  </button>
                )}
              </div>
              <p className="text-[12px] leading-4 text-[#94a3b8]">JPG, PNG or SVG. Max size 2MB.</p>
              <StatusLine status={logo.status} className="text-[12px]" />
            </div>
            {logo.input}
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          <InputField label="Business Name" name="businessName" value={v.businessName} onChange={(e) => set("businessName", e.target.value)} error={errors.businessName} maxLength={200} autoComplete="organization" />
          <div className="flex flex-col gap-3">
            <InputField label="Contact Name" name="contactName" value={v.contactName} onChange={(e) => set("contactName", e.target.value)} error={errors.contactName} maxLength={200} autoComplete="name" />
            <ToggleRow label="Show on Quotes & Invoices" checked={v.showContact} onChange={(c) => set("showContact", c)} color="#009d63" />
          </div>
          <InputField label="Phone Number" name="businessPhone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} maxLength={40} autoComplete="tel" />
          <InputField label="Email Address" name="businessEmail" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} error={errors.email} autoComplete="email" />
        </div>

        <div className="flex flex-col gap-3">
          <InputField
            label="Website"
            name="website"
            prefix="https://"
            value={v.website}
            onChange={(e) => set("website", e.target.value.replace(/^https?:\/\//i, ""))}
            error={errors.website}
            maxLength={200}
            placeholder="yourbusiness.com"
            autoComplete="url"
          />
          <ToggleRow label="Show on Quotes & Invoices" checked={v.showWebsite} onChange={(c) => set("showWebsite", c)} color="#009d63" />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="address">Business Address</FieldLabel>
            <textarea
              id="address"
              rows={3}
              value={v.address}
              maxLength={1000}
              onChange={(e) => set("address", e.target.value)}
              className={`${fieldInput} h-24 resize-y py-[11px] leading-6`}
            />
            <FieldError id="address-error" message={errors.address} />
          </div>
          <ToggleRow label="Show on Quotes & Invoices" checked={v.showAddress} onChange={(c) => set("showAddress", c)} color="#009d63" />
        </div>

        <CardFooter pending={form.pending} dirty={form.dirty} onCancel={form.cancel} status={form.status} className="" />
      </form>
    </SettingsCard>
  );
}
