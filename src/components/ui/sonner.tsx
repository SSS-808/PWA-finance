"use client";

import { Toaster as Sonner } from "sonner";

// The app's toast area: top-centre, gone after 3 seconds, coloured with our tokens
export function Toaster() {
  return (
    <Sonner
      theme="system"
      position="top-center"
      duration={3000}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
    />
  );
}
