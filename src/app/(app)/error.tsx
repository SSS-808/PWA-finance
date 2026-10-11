"use client";

import { ErrorMessage } from "@/components/shared/error-message";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="w-full max-w-md">
      <ErrorMessage error={error} retry={retry} />
    </div>
  );
}
