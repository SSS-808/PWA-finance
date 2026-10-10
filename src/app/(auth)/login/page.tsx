import { Suspense } from "react";
import { en } from "@/messages/en";
import { AuthShell, LoginForm } from "@/modules/auth";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell title={en.auth.login.title}>
      <Suspense>
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
  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      linkError={error === "link"}
    />
  );
}
