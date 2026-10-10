"use client";

import { CircleQuestionMark } from "lucide-react";
import { Popover } from "radix-ui";
import { en } from "@/messages/en";

export function HelpHint({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={en.help.about.replace("{field}", () => label)}
        className="-my-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CircleQuestionMark aria-hidden="true" className="size-5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 max-w-64 rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
