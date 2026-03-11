import { redirect } from "next/navigation";

export default function SignUpPage() {
  // Registration flow is handled implicitly via onboarding – no standalone page.
  redirect("/voice-chat");
}