"use client";

import type * as React from "react";
import { Input } from "@/components/ui/input";
import { groupAmountInput } from "@/modules/money";

function regroup(input: HTMLInputElement) {
  const before = input.value;
  const grouped = groupAmountInput(before);
  if (grouped === before) return;
  const caret = input.selectionStart ?? before.length;
  // Count the characters left of the cursor that are not commas, then find the same spot in the new text
  const kept = before.slice(0, caret).replaceAll(",", "").length;
  let position = 0;
  for (let seen = 0; position < grouped.length && seen < kept; position++) {
    if (grouped[position] !== ",") seen++;
  }
  input.value = grouped;
  input.setSelectionRange(position, position);
}

// An amount box that shows thousands commas while the person types
export function AmountInput({
  defaultValue,
  onChange,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      inputMode="decimal"
      autoComplete="off"
      defaultValue={
        typeof defaultValue === "string"
          ? groupAmountInput(defaultValue)
          : defaultValue
      }
      onChange={(event) => {
        const native = event.nativeEvent;
        if (!("isComposing" in native && native.isComposing)) {
          regroup(event.currentTarget);
        }
        return onChange?.(event);
      }}
    />
  );
}
