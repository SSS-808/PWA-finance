import { en } from "@/messages/en";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-2 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{en.app.name}</h1>
      <p className="text-muted-foreground">{en.app.tagline}</p>
    </main>
  );
}
