import { redirect } from "next/navigation";

// The dashboard lives at /onboarding until a new user finishes setup.
export default function DashboardPage() {
  redirect("/onboarding");
}
