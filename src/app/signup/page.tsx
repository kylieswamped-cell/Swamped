import type { Metadata } from "next";
import { Suspense } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { SignupAside } from "@/components/auth/AuthAsides";
import AuthViews from "@/components/auth/AuthViews";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account — Swamped",
  description: "Create your free Swamped account.",
};

export default function SignupPage() {
  return (
    <>
      <AuthLayout aside={<SignupAside />} asideRight>
        <SignupForm />
      </AuthLayout>
      <Suspense>
        <AuthViews />
      </Suspense>
    </>
  );
}
