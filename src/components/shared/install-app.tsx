"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { HelpHint } from "@/components/shared/help-hint";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";

// Chrome and Edge's install event; TypeScript's DOM types don't have it yet
type InstallPromptEvent = Event & { prompt: () => Promise<void> };

type Device = "ios" | "other";

// iPadOS reports itself as a Mac, so a touch screen tells them apart
function readDevice(): Device {
  const { userAgent, maxTouchPoints } = navigator;
  return /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
    ? "ios"
    : "other";
}

function subscribeNever(): () => void {
  return () => {};
}

function RowIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
    >
      <Smartphone className="size-5" />
    </span>
  );
}

// The Settings row: an Install button where the browser offers one, otherwise the steps behind a "?"
export function InstallApp({ className }: { className: string }) {
  const device = useSyncExternalStore(subscribeNever, readDevice, () => null);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    function capture(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    }
    function forget() {
      setPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", forget);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", forget);
    };
  }, []);

  if (prompt && device !== "ios") {
    return (
      <button
        type="button"
        onClick={async () => {
          await prompt.prompt();
          setPrompt(null);
        }}
        className={cn(
          className,
          "w-full text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <RowIcon />
        <span className="min-w-0 flex-1 text-base font-medium">
          {en.settings.app.install}
        </span>
      </button>
    );
  }

  const label =
    device === "ios" ? en.settings.app.addToHome : en.settings.app.install;
  return (
    <div className={cn(className, "hover:bg-transparent")}>
      <RowIcon />
      <span className="min-w-0 flex-1 text-base font-medium">{label}</span>
      {device && (
        <HelpHint label={label}>
          {device === "ios"
            ? en.settings.app.iosSteps
            : en.settings.app.otherSteps}
        </HelpHint>
      )}
    </div>
  );
}
