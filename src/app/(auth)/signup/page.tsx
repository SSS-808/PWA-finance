import Link from "next/link";
import { Suspense } from "react";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { AuthShell, SignupForm, isSignupOpen } from "@/modules/auth";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        // The auth shell sits inside this boundary, so the fallback draws its frame
        <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
          <LoadingStatus />
          <div className="rounded-2xl border border-border bg-card p-5">
            <FormSkeleton fields={2} />
          </div>
        </main>
      }
    >
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
