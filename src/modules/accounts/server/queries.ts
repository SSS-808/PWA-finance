import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { isCurrencyCode, money, type Money } from "@/modules/money";
import { isAccountType } from "../domain/account-types";
import type { Account } from "../domain/types";

export type AccountDetail = Account & { openingBalance: Money };

type AccountRow = {
  id: string;
  name: string;
  type: string;
  currency: string;
  archived_at: string | null;
};

const ACCOUNT_COLUMNS = "id, name, type, currency, archived_at";

const idSchema = z.uuid();

function toAccount(row: AccountRow, balanceMinor: number | null): Account {
  // The database checks these values, so anything else is a bug
  if (!isAccountType(row.type)) {
    throw new Error(`Unexpected account type: ${row.type}`);
  }
  if (!isCurrencyCode(row.currency)) {
    throw new Error(`Unexpected account currency: ${row.currency}`);
  }
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    archived: row.archived_at !== null,
    balance: money(balanceMinor ?? 0, row.currency),
  };
}

// Active and archived accounts with their balances; the view can't be embedded, so they are merged here
export async function listAccounts(): Promise<Account[]> {
  await requireUser();
  const supabase = await createClient();
  const [accounts, balances] = await Promise.all([
    supabase.from("accounts").select(ACCOUNT_COLUMNS).order("name"),
    supabase.from("account_balances").select("account_id, balance_minor"),
  ]);
  if (accounts.error) {
    throw new Error("Could not load the accounts", { cause: accounts.error });
  }
  if (balances.error) {
    throw new Error("Could not load the balances", { cause: balances.error });
  }
  const balanceById = new Map(
    balances.data.map((row) => [row.account_id, row.balance_minor]),
  );
  return accounts.data.map((row) =>
    toAccount(row, balanceById.get(row.id) ?? null),
  );
}

// One account with its balance and current starting amount; a bad id or someone else's account is a 404
export async function getAccount(id: string): Promise<AccountDetail> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [account, balance, opening] = await Promise.all([
    supabase
      .from("accounts")
      .select(ACCOUNT_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("account_balances")
      .select("balance_minor")
      .eq("account_id", id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("amount_minor")
      .eq("account_id", id)
      .eq("kind", "opening_balance")
      .is("deleted_at", null)
      .maybeSingle(),
  ]);
  if (account.error) {
    throw new Error("Could not load the account", { cause: account.error });
  }
  if (balance.error) {
    throw new Error("Could not load the balance", { cause: balance.error });
  }
  if (opening.error) {
    throw new Error("Could not load the starting amount", {
      cause: opening.error,
    });
  }
  if (!account.data) notFound();

  const detail = toAccount(account.data, balance.data?.balance_minor ?? null);
  return {
    ...detail,
    openingBalance: money(opening.data?.amount_minor ?? 0, detail.currency),
  };
}
