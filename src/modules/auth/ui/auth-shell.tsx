import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { en } from "@/messages/en";

export function AuthShell({
  title,
  description,
  children,
  embedded = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  embedded?: boolean;
}) {
  // Inside the app layout the page already has a <main>, so this is a plain block
  const Wrapper = embedded ? "div" : "main";
  const wrapperClass = embedded
    ? "w-full max-w-sm"
    : "mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12";
  return (
    <Wrapper className={wrapperClass}>
      {embedded ? null : (
        <div className="mb-8 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <Wallet className="size-5" />
          </span>
          <span className="text-base font-semibold">{en.app.name}</span>
        </div>
      )}
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-2 text-base text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        {children}
      </div>
    </Wrapper>
  );
}
