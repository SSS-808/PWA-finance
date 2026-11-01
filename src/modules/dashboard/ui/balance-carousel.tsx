"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";

// The currency cards in one row: swipe sideways or tap a dot for the next one; a single card shows alone
export function BalanceCarousel({
  labels,
  children,
}: {
  labels: readonly string[];
  children: ReactNode;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const slides = Children.toArray(children);
  if (slides.length < 2) return children;

  // The dots follow how far the row has scrolled
  function followScroll(element: HTMLDivElement) {
    const furthest = element.scrollWidth - element.clientWidth;
    setActive(
      furthest > 0
        ? Math.round((element.scrollLeft / furthest) * (slides.length - 1))
        : 0,
    );
  }

  function show(index: number) {
    const element = row.current;
    const slide = element?.children[index];
    if (!element || !(slide instanceof HTMLElement)) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({
      left: slide.offsetLeft,
      behavior: still ? "auto" : "smooth",
    });
  }

  return (
    <div className="space-y-1">
      <div
        ref={row}
        role="region"
        aria-label={en.dashboard.balances}
        tabIndex={0}
        onScroll={(event) => followScroll(event.currentTarget)}
        className="relative flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto overscroll-x-contain rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {slides.map((slide, index) => (
          <div
            key={labels[index] ?? index}
            className="grid w-full shrink-0 snap-start snap-always"
          >
            {slide}
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={en.dashboard.showCard.replace(
              "{currency}",
              () => label,
            )}
            aria-current={index === active ? "true" : undefined}
            onClick={() => show(index)}
            className="flex h-6 w-7 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span
              className={cn(
                "block h-2 rounded-full transition-[width] motion-reduce:transition-none",
                index === active
                  ? "w-5 bg-foreground"
                  : "w-2 bg-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
