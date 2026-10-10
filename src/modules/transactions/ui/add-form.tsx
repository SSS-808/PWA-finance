"use client";

import { useState } from "react";
import type { AccountOption, CategoryOption, EntryKind } from "../domain/types";
import { EntryForm } from "./entry-form";
import { TransferForm } from "./transfer-form";

type View = { type: "entry"; kind: EntryKind } | { type: "transfer" };

// The Add page: Expense and Income share one form; Transfer swaps in its own
export function AddForm({
  returnTo,
  accounts,
  expenseCategories,
  incomeCategories,
  defaultAccountId,
  today,
}: {
  returnTo: string;
  accounts: readonly AccountOption[];
  expenseCategories: readonly CategoryOption[];
  incomeCategories: readonly CategoryOption[];
  defaultAccountId: string;
  today: string;
}) {
  const [view, setView] = useState<View>({ type: "entry", kind: "expense" });

  if (view.type === "transfer") {
    return (
      <TransferForm
        mode="create"
        returnTo={returnTo}
        accounts={accounts}
        defaultAccountId={defaultAccountId}
        today={today}
        onChooseEntry={(kind) => setView({ type: "entry", kind })}
      />
    );
  }
  return (
    <EntryForm
      mode="create"
      returnTo={returnTo}
      accounts={accounts}
      expenseCategories={expenseCategories}
      incomeCategories={incomeCategories}
      defaultAccountId={defaultAccountId}
      today={today}
      initialKind={view.kind}
      onTransfer={() => setView({ type: "transfer" })}
    />
  );
}
