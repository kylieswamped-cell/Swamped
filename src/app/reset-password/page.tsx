import { redirect } from "next/navigation";

// Target of the password-reset email link. Forwards any token params
// (e.g. ?code=...) so the auth backend can verify them once it's wired up.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  params.set("view", "reset-password");
  redirect(`/login?${params}`);
}
