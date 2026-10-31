import { Suspense } from "react";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { AuthShell, LoginForm, isSignupOpen } from "@/modules/auth";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell title={en.auth.login.title}>
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton fields={2} />
          </>
        }
      >
        <LoginFormLoader searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginFormLoader({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { next, error } = await searchParams;
  const signupOpen = await isSignupOpen();
  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      linkError={error === "link"}
      signupOpen={signupOpen}
    />
  );
}
