import Link from "next/link";
import { Suspense } from "react";
import { en } from "@/messages/en";
import { AuthShell, SignupForm, isSignupOpen } from "@/modules/auth";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

async function SignupContent() {
  const signupOpen = await isSignupOpen();
  if (signupOpen) {
    return (
      <AuthShell title={en.auth.signup.title}>
        <SignupForm />
      </AuthShell>
    );
  }
  return (
    <AuthShell title={en.auth.signup.closedTitle}>
      <Link
        href="/login"
        className="inline-block py-2 font-medium underline underline-offset-4"
      >
        {en.auth.signup.loginLink}
      </Link>
    </AuthShell>
  );
}
