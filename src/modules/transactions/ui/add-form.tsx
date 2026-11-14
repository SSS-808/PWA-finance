"use client";

import { useState } from "react";
import type {
  AccountOption,
  CategoryOption,
  EntryKind,
  TripOption,
} from "../domain/types";
import { EntryForm } from "./entry-form";
import { TransferForm } from "./transfer-form";

// The run counts up each time an entry was kept on the phone, which empties the form
type View =
  { type: "entry"; kind: EntryKind; run: number } | { type: "transfer" };

// The Add page: Expense and Income share one form; Transfer swaps in its own
export function AddForm({
  title,
  returnTo,
  savedTo,
  userId,
  timeZone,
  initialKind,
  accounts,
  expenseCategories,
  incomeCategories,
  trips,
  defaultAccountId,
  today,
}: {
  title: string;
  returnTo: string;
  savedTo: string;
  userId: string;
  timeZone: string;
  initialKind: EntryKind;
  accounts: readonly AccountOption[];
  expenseCategories: readonly CategoryOption[];
  incomeCategories: readonly CategoryOption[];
  trips: readonly TripOption[];
  defaultAccountId: string;
  today: string;
}) {
  const [view, setView] = useState<View>({
    type: "entry",
    kind: initialKind,
    run: 0,
  });

  if (view.type === "transfer") {
    return (
      <TransferForm
        title={title}
        mode="create"
        returnTo={returnTo}
        accounts={accounts}
        defaultAccountId={defaultAccountId}
        today={today}
        onChooseEntry={(kind) => setView({ type: "entry", kind, run: 0 })}
      />
    );
  }
  return (
    <EntryForm
      key={view.run}
      title={title}
      mode="create"
      userId={userId}
      timeZone={timeZone}
      savedTo={savedTo}
      accounts={accounts}
      expenseCategories={expenseCategories}
      incomeCategories={incomeCategories}
      trips={trips}
      defaultAccountId={defaultAccountId}
      today={today}
      initialKind={view.kind}
      onTransfer={() => setView({ type: "transfer" })}
      onKept={(kind) => setView({ type: "entry", kind, run: view.run + 1 })}
    />
  );
}
