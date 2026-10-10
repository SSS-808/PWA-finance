import type { ReactNode } from "react";

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
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-2 text-base text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-8">{children}</div>
    </Wrapper>
  );
}
