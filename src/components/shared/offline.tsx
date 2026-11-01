"use client";

import { CloudOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HelpHint } from "@/components/shared/help-hint";
import { en } from "@/messages/en";

// Matches the "pages-" caches in public/sw.js, which hold copies of personal data
const SAVED_PAGES_PREFIX = "pages-";

const CHECK_EVERY_MS = 10_000;
const CHECK_WAIT_MS = 4_000;

const savedAtFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

async function readSavedAt(): Promise<string | null> {
  const saved = await caches.match(window.location.href, { ignoreVary: true });
  const date = saved?.headers.get("date");
  return date ? savedAtFormat.format(new Date(date)) : null;
}

// Starts the offline helper, tells it about each page load, and says so when the page on screen is a saved copy
export function OfflineBanner() {
  const router = useRouter();
  const [copy, setCopy] = useState<{ savedAt: string | null } | null>(null);

  useEffect(() => {
    // On a dev server the helper would keep half-built files
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    // Without the helper the app still works online
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {});

    const worker = navigator.serviceWorker;
    async function answer(event: MessageEvent) {
      if (event.data?.type !== "was-copy" || !event.data.value) return;
      setCopy({ savedAt: await readSavedAt() });
    }
    worker.addEventListener("message", answer);
    worker.startMessages();
    // Through "ready", so the first visit, before the helper controls the page, starts the background saving too
    void worker.ready.then((registration) =>
      registration.active?.postMessage("page-loaded"),
    );
    return () => worker.removeEventListener("message", answer);
  }, []);

  // While a copy is showing, looks for the server and swaps in fresh data once it answers
  useEffect(() => {
    if (!copy) return;
    let done = false;
    async function check() {
      try {
        await fetch("/manifest.webmanifest", {
          method: "HEAD",
          cache: "no-store",
          signal: AbortSignal.timeout(CHECK_WAIT_MS),
        });
      } catch {
        return;
      }
      if (done) return;
      done = true;
      setCopy(null);
      router.refresh();
    }
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    void check();
    return () => {
      done = true;
      window.clearInterval(timer);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [copy, router]);

  if (!copy) return null;
  return (
    <div
      role="status"
      className="mb-4 flex w-full max-w-2xl items-center gap-2 rounded-2xl bg-muted py-1 pr-1 pl-4 text-sm"
    >
      <CloudOff
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1">
        {copy.savedAt
          ? en.offline.banner.replace("{time}", () => copy.savedAt ?? "")
          : en.offline.bannerNoTime}
      </span>
      <HelpHint label={en.offline.helpLabel}>{en.offline.help}</HelpHint>
    </div>
  );
}

// Deletes the copies of personal pages; it sits on the login screens, so log-out always clears them
export function ForgetSavedPages() {
  useEffect(() => {
    if (!("caches" in window)) return;
    void caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(SAVED_PAGES_PREFIX))
            .map((name) => caches.delete(name)),
        ),
      );
  }, []);
  return null;
}
