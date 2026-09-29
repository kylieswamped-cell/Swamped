"use client";

import { ArrowRight, Mail, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import { createFirstCustomer } from "@/lib/onboarding/actions";
import { Field, FormError, PrimaryButton, TextAreaField, TextField } from "./fields";
import FileDrop from "./FileDrop";
import StepModal from "./StepModal";
import { uploadAttachment } from "./uploadAttachment";
import { formValues, useStepSubmit } from "./useStepSubmit";

export type CustomerOption = { id: string; name: string; email: string | null };

export default function CustomerStep({ onDone }: { onDone: (customer: CustomerOption) => void }) {
  const { pending, error, fieldErrors: fe, run } = useStepSubmit();
  const [file, setFile] = useState<File | null>(null);
  const icon = "size-4";

  return (
    <StepModal
      label="Step 3 of 4"
      title="Add Your First Customer"
      description={
        <>
          <p>Ready to send a real quote? Add your first customer to get started.</p>
          <p className="mt-3">Just exploring? Add yourself as a test customer and see how the process works.</p>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const values = formValues(e.currentTarget);
          run(
            async () => {
              let attachmentPath = "";
              if (file) {
                try {
                  attachmentPath = await uploadAttachment(file, "customers");
                } catch (err) {
                  return { error: (err as Error).message };
                }
              }
              return createFirstCustomer({ ...values, attachmentPath });
            },
            (result) => result.customer && onDone(result.customer),
          );
        }}
        className="flex flex-col gap-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Customer Name" name="name" required icon={<User className={icon} />} placeholder="e.g., John Doe" error={fe.name} autoComplete="off" />
          <TextField label="Street Address" name="streetAddress" icon={<MapPin className={icon} />} placeholder="e.g., 123 Maple St" autoComplete="off" />
          <TextField label="Phone Number" name="phone" type="tel" icon={<Phone className={icon} />} placeholder="(555) 000-0000" autoComplete="off" />
          <TextField label="Email Address" name="email" type="email" icon={<Mail className={icon} />} placeholder="name@company.com" error={fe.email} hint="Needed to email them quotes." autoComplete="off" />
          <TextAreaField label="Notes" name="notes" rows={2} placeholder="Private notes about this client..." />
          <Field label="File Upload" name="customerFile">
            <FileDrop id="customerFile" file={file} onFile={setFile} compact />
          </Field>
        </div>
        <FormError message={error} />
        <div className="flex justify-center border-t border-[#e2e8f0] pt-6">
          <PrimaryButton pending={pending}>
            Create Customer &amp; Next <ArrowRight className="size-4" />
          </PrimaryButton>
        </div>
      </form>
    </StepModal>
  );
}
