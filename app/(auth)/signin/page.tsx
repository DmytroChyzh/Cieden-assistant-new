import { redirect } from "next/navigation";

export default function SignInPage() {
  // Auth pages are deprecated – always send users to the main assistant
  redirect("/voice-chat");
}