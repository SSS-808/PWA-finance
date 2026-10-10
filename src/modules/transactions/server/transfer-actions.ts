"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import { fieldErrorsFrom } from "../domain/schemas";
import {
  type TransferOutput,
  parseTransferAmounts,
  transferSchema,
} from "../domain/transfer-schema";
import type { TransferFieldName, TransferFormState } from "../domain/types";
import { rememberAccount } from "./last-account";
import { getTransfer } from "./queries";
import { savedTarget, withParam } from "./saved-target";

type TransferArgs = {
  p_from_account: string;
  p_to_account: string;
  p_from_amount_minor: number;
  p_to_amount_minor: number;
  p_date: string;
  p_description?: string;
};

type BuiltTransfer =
  { ok: true; args: TransferArgs } | { ok: false; state: TransferFormState };

const FIELDS: readonly TransferFieldName[] = [
  "fromAccountId",
  "toAccountId",
  "amount",
  "arrived",
  "date",
  "note",
];

function readValues(formData: FormData): Record<TransferFieldName, string> {
  const values = {} as Record<TransferFieldName, string>;
  for (const name of FIELDS) {
    const value = formData.get(name);
    values[name] = typeof value === "string" ? value : "";
  }
  return values;
}

// Both currencies come from the database accounts, never from the browser
async function buildArgs(data: TransferOutput): Promise<BuiltTransfer> {
  const accounts = await listAccounts();
  // Archived accounts can't take part in a new or edited transfer
  const from = accounts.find(
    (account) => account.id === data.fromAccountId && !account.archived,
  );
  const to = accounts.find(
    (account) => account.id === data.toAccountId && !account.archived,
  );
  if (!from || !to) {
    return {
      ok: false,
      state: {
        status: "error",
        fieldErrors: from
          ? { toAccountId: "account_required" }
          : { fromAccountId: "account_required" },
      },
    };
  }
  const amounts = parseTransferAmounts(
    data.amount,
    data.arrived,
    from.currency,
    to.currency,
  );
  if (!amounts.ok) {
    return {
      ok: false,
      state: {
        status: "error",
        fieldErrors: { [amounts.field]: amounts.error },
      },
    };
  }
  return {
    ok: true,
    args: {
      p_from_account: from.id,
      p_to_account: to.id,
      p_from_amount_minor: amounts.from.minor,
      p_to_amount_minor: amounts.to.minor,
      p_date: data.date,
      p_description: data.note ?? undefined,
    },
  };
}

function databaseErrorState(error: {
  code: string;
  message: string;
}): TransferFormState {
  // 22023 is a rule the functions check themselves; the message tells which one
  if (error.code === "22023" && error.message.includes("different")) {
    return { status: "error", fieldErrors: { toAccountId: "same_account" } };
  }
  if (error.code === "22023" && error.message.includes("must match")) {
    return { status: "error", fieldErrors: { amount: "amounts_must_match" } };
  }
  // P0002 is raised when an account or the transfer isn't there, isn't yours or is archived
  if (error.code === "P0002") return { status: "error", error: "not_found" };
  console.error("Could not save the transfer", {
    code: error.code,
    message: error.message,
  });
  return { status: "error", error: "unknown" };
}

export async function createTransfer(
  returnTo: string,
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  await requireUser();
  const parsed = transferSchema.safeParse(readValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom<TransferFieldName>(parsed.error),
    };
  }
  const built = await buildArgs(parsed.data);
  if (!built.ok) return built.state;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_transfer", built.args);
  if (error) return databaseErrorState(error);

  await rememberAccount(built.args.p_from_account);
  redirect(withParam(savedTarget(returnTo), "saved_transfer", data));
}

export async function updateTransfer(
  transferId: string,
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  await requireUser();
  // A bad id, someone else's transfer or a deleted one is a 404
  await getTransfer(transferId);
  const parsed = transferSchema.safeParse(readValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom<TransferFieldName>(parsed.error),
    };
  }
  const built = await buildArgs(parsed.data);
  if (!built.ok) return built.state;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_transfer", {
    p_transfer_id: transferId,
    ...built.args,
  });
  if (error) return databaseErrorState(error);

  redirect(`/transactions?saved_transfer=${transferId}`);
}

// A soft delete of both legs; the audit log keeps the history
export async function deleteTransfer(transferId: string): Promise<void> {
  await requireUser();
  if (!z.uuid().safeParse(transferId).success) notFound();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_transfer", {
    p_transfer_id: transferId,
  });
  // P0002 means the transfer isn't there, isn't yours or is already deleted
  if (error?.code === "P0002") notFound();
  if (error) {
    console.error("Could not delete the transfer", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Could not delete the transfer", { cause: error });
  }

  redirect("/transactions?deleted=1");
}
