"use client";

import { createClient } from "@/lib/supabase/client";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_UPLOADS = ".pdf,.jpg,.jpeg,.png";

/**
 * Uploads straight from the browser to the private "attachments" bucket
 * (server actions cap request bodies at 1 MB). Storage policies only allow
 * writes under the user's own folder.
 */
export async function uploadAttachment(file: File, folder: string) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Files must be 10 MB or smaller.");
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Your session has expired. Please log in again.");

  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${data.user.id}/${folder}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const { error } = await supabase.storage.from("attachments").upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error("Couldn't upload the file. Please try again.");
  return path;
}
