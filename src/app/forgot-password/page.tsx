import { redirect } from "next/navigation";

export default function ForgotPasswordPage() {
  redirect("/login?view=forgot-password");
}
