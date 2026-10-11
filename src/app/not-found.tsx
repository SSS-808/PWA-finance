import { NotFoundMessage } from "@/components/shared/not-found-message";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <NotFoundMessage />
    </main>
  );
}
