"use client";

import { useState } from "react";
import type { AccountOption, CategoryOption, EntryKind } from "../domain/types";
import { EntryForm } from "./entry-form";
import { TransferForm } from "./transfer-form";

type View = { type: "entry"; kind: EntryKind } | { type: "transfer" };

// The Add page: Expense and Income share one form; Transfer swaps in its own
export function AddForm({
  title,
  returnTo,
  initialKind,
  accounts,
  expenseCategories,
  incomeCategories,
  defaultAccountId,
  today,
}: {
  title: string;
  returnTo: string;
  initialKind: EntryKind;
  accounts: readonly AccountOption[];
  expenseCategories: readonly CategoryOption[];
  incomeCategories: readonly CategoryOption[];
  defaultAccountId: string;
  today: string;
}) {
  const [view, setView] = useState<View>({ type: "entry", kind: initialKind });

  if (view.type === "transfer") {
    return (
      <TransferForm
        title={title}
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
      title={title}
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
