import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — Swamped",
};

// Placeholder until the dashboard designs land — proves the session works.
export default async function DashboardPage() {
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  // Check here too, not just in the proxy: pages must verify auth themselves.
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/dashboard");

  const { email, user_metadata: meta } = data.user;
  const name = (meta.full_name as string | undefined) || email;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-surface">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 sm:px-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Swamped" width={36} height={36} />
            <span className="text-[22px] font-bold tracking-[-0.6px] text-logo">SWAMPED</span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-border px-5 py-2 text-[14px] font-semibold text-navy transition-colors hover:border-brand hover:text-brand"
            >
              Log Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-16 sm:px-16">
        <h1 className="text-[32px] font-extrabold text-navy">Welcome, {name}</h1>
        <p className="mt-2 text-[16px] text-muted">You&apos;re signed in to Swamped.</p>

        <dl className="mt-10 grid max-w-[640px] gap-4 rounded-3xl border border-border bg-white p-8 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[0.6px] text-muted-light">Email</dt>
            <dd className="mt-1 text-[16px] text-navy">{email}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[0.6px] text-muted-light">Business</dt>
            <dd className="mt-1 text-[16px] text-navy">{(meta.business_name as string) || "—"}</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
