import type { Metadata } from "next";
import { Suspense } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { LoginAside } from "@/components/auth/AuthAsides";
import AuthViews from "@/components/auth/AuthViews";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In — Swamped",
  description: "Log in to access your Swamped account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next, notice } = await searchParams;

  return (
    <>
      <AuthLayout aside={<LoginAside />}>
        <LoginForm
          next={typeof next === "string" ? next : null}
          notice={typeof notice === "string" ? notice : null}
        />
      </AuthLayout>
      <Suspense>
        <AuthViews />
      </Suspense>
    </>
  );
}
