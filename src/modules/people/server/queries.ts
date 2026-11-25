import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { JAR_TYPE, listAccounts } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import { isCurrencyCode, money } from "@/modules/money";
import { labelEntries } from "../domain/calculations";
import type {
  AccountChoice,
  Jar,
  JarRow,
  Person,
  PersonEntry,
} from "../domain/types";

// A person with the history of their jars, newest first
export type PersonPage = { person: Person; entries: PersonEntry[] };

type JarRecord = {
  id: string;
  currency: string;
  person_id: string | null;
  due_on: string | null;
};

const idSchema = z.uuid();

// Enough for years of lending; the API returns at most this many rows anyway
const MAX_ROWS = 1000;

function toJar(record: JarRecord, balances: Map<string, number>): Jar {
  // The database checks this value, so anything else is a bug
  if (!isCurrencyCode(record.currency)) {
    throw new Error(`Unexpected jar currency: ${record.currency}`);
  }
  return {
    id: record.id,
    currency: record.currency,
    balance: money(balances.get(record.id) ?? 0, record.currency),
    dueOn: record.due_on,
  };
}

async function loadBalances(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_balances")
    .select("account_id, balance_minor");
  if (error) throw new Error("Could not load the balances", { cause: error });
  const balances = new Map<string, number>();
  for (const row of data) {
    if (row.account_id !== null && row.balance_minor !== null) {
      balances.set(row.account_id, row.balance_minor);
    }
  }
  return balances;
}

// The open jars of the given people, grouped by person
async function loadJars(
  personIds: readonly string[],
): Promise<Map<string, Jar[]>> {
  const supabase = await createClient();
  const [jars, balances] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, currency, person_id, due_on")
      .eq("type", JAR_TYPE)
      .is("archived_at", null)
      .in("person_id", [...personIds])
      .order("currency"),
    loadBalances(),
  ]);
  if (jars.error) {
    throw new Error("Could not load the jars", { cause: jars.error });
  }
  const byPerson = new Map<string, Jar[]>();
  for (const record of jars.data) {
    if (record.person_id === null) continue;
    const list = byPerson.get(record.person_id) ?? [];
    list.push(toJar(record, balances));
    byPerson.set(record.person_id, list);
  }
  return byPerson;
}

// Everyone who is not archived, with their jars
export async function listPeople(): Promise<Person[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  if (error) throw new Error("Could not load the people", { cause: error });
  const jars = await loadJars(data.map((row) => row.id));
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    jars: jars.get(row.id) ?? [],
  }));
}

// One person; a bad id, an archived person or someone else's is a 404
export async function getPerson(id: string): Promise<Person> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, name")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error("Could not load the person", { cause: error });
  if (!data) notFound();
  const jars = await loadJars([data.id]);
  return { id: data.id, name: data.name, jars: jars.get(data.id) ?? [] };
}

// The person and every non-deleted entry on their jars, with the account on the other side of each transfer
export async function getPersonPage(id: string): Promise<PersonPage> {
  const person = await getPerson(id);
  const jarIds = person.jars.map((jar) => jar.id);
  if (jarIds.length === 0) return { person, entries: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, account_id, kind, transfer_id, amount_minor, currency, description, transaction_date, created_at",
    )
    .in("account_id", jarIds)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw new Error("Could not load the history", { cause: error });

  const transferIds = data.flatMap((row) =>
    row.transfer_id === null ? [] : [row.transfer_id],
  );
  const others = new Map<string, string>();
  if (transferIds.length > 0) {
    const legs = await supabase
      .from("transactions")
      .select("transfer_id, account_id, accounts(name)")
      .in("transfer_id", transferIds)
      .is("deleted_at", null);
    if (legs.error) {
      throw new Error("Could not load the other side of the transfers", {
        cause: legs.error,
      });
    }
    for (const leg of legs.data) {
      if (leg.transfer_id !== null && !jarIds.includes(leg.account_id)) {
        others.set(leg.transfer_id, leg.accounts?.name ?? "");
      }
    }
  }

  const rows: JarRow[] = data.map((row) => {
    if (!isCurrencyCode(row.currency)) {
      throw new Error(`Unexpected transaction currency: ${row.currency}`);
    }
    return {
      id: row.id,
      jarId: row.account_id,
      kind: row.kind as JarRow["kind"],
      transferId: row.transfer_id,
      amount: money(row.amount_minor, row.currency),
      date: row.transaction_date,
      createdAt: row.created_at,
      note: row.description,
      otherAccount:
        row.transfer_id === null ? null : (others.get(row.transfer_id) ?? null),
    };
  });
  return { person, entries: labelEntries(rows) };
}

// The person and one of their jars that still holds money; anything else is a 404
export async function getRepayPage(
  personId: string,
  jarId: string,
): Promise<{ person: Person; jar: Jar }> {
  const person = await getPerson(personId);
  const jar = person.jars.find(
    (candidate) => candidate.id === jarId && candidate.balance.minor !== 0,
  );
  if (!jar) notFound();
  return { person, jar };
}

// Your own accounts that are not archived, as the forms offer them
export async function listAccountChoices(): Promise<AccountChoice[]> {
  const accounts = await listAccounts();
  return accounts
    .filter((account) => !account.archived)
    .map(({ id, name, currency }) => ({ id, name, currency }));
}
