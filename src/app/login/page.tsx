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

export default function LoginPage() {
  return (
    <>
      <AuthLayout aside={<LoginAside />}>
        <LoginForm />
      </AuthLayout>
      <Suspense>
        <AuthViews />
      </Suspense>
    </>
  );
}
