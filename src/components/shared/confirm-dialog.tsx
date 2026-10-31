"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

// A pop-up on the native <dialog>: it traps focus and closes on Esc without a library
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      confirmRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      // Esc closes the dialog by itself; going through onCancel keeps the parent's state in step
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // Only a click on the backdrop has the dialog itself as its target, so the padding sits in the inner box
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-border bg-card p-0 text-center text-foreground shadow-xl backdrop:bg-black/45"
    >
      <div className="space-y-4 p-6">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-cat-amber-soft text-cat-amber"
        >
          <TriangleAlert className="size-6" />
        </span>
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        <div id={bodyId} className="text-base text-muted-foreground">
          {children}
        </div>
        <div className="space-y-3">
          <Button
            ref={confirmRef}
            type="button"
            className="h-12 w-full text-base"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
