"use client";

import { ErrorMessage } from "@/components/shared/error-message";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
          <ErrorMessage error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
