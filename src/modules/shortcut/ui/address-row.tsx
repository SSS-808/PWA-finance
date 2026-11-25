"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";

const text = en.shortcut.settings;

function subscribe(): () => void {
  return () => {};
}

function readAddress(): string {
  return `${window.location.origin}/api/shortcut`;
}

function readServerAddress(): string {
  return "";
}

// The address the Shortcut posts to; the server renders it empty so the browser agrees on hydration
export function AddressRow() {
  const address = useSyncExternalStore(
    subscribe,
    readAddress,
    readServerAddress,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{text.address}</p>
        <p className="min-h-6 font-mono text-sm break-all">{address}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="size-11 shrink-0 text-muted-foreground"
        aria-label={text.copyAddress}
        disabled={address === ""}
        onClick={copy}
      >
        {copied ? (
          <Check className="size-5" aria-hidden="true" />
        ) : (
          <Copy className="size-5" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
