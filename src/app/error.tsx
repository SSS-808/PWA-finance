"use client";

import { ErrorMessage } from "@/components/shared/error-message";

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <ErrorMessage error={error} retry={retry} />
    </main>
  );
}
