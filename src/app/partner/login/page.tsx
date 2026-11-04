import type { Metadata } from "next";
import { Suspense } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { LoginAside } from "@/components/auth/AuthAsides";
import AuthViews from "@/components/auth/AuthViews";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Partner Login — Swamped",
  description: "Log in to the Swamped partner portal.",
};

// Figma 822:745.
export default async function PartnerLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next, notice } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/partner/") ? next : "/partner/dashboard";

  return (
    <>
      <AuthLayout aside={<LoginAside partner />}>
        <LoginForm partner next={target} notice={typeof notice === "string" ? notice : null} />
      </AuthLayout>
      <Suspense>
        <AuthViews />
      </Suspense>
    </>
  );
}
