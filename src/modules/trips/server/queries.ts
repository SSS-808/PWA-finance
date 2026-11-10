import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { listAllCategories } from "@/modules/categories";
import {
  type CurrencySummary,
  type SummaryRow,
  monthSummary,
} from "@/modules/dashboard";
import { type Money, isCurrencyCode, money } from "@/modules/money";
import { type TripSpendRow, spentByTrip } from "../domain/calculations";
import type { Trip } from "../domain/types";

// Everything the trip page shows; entries counts the trip's income and expense rows
export type TripPage = {
  trip: Trip;
  summaries: CurrencySummary[];
  entries: number;
};

type TripRow = { id: string; name: string; starts_on: string; ends_on: string };

const TRIP_COLUMNS = "id, name, starts_on, ends_on";

// Matches the API's row limit, so a longer trip is read in pages
const PAGE_SIZE = 1000;

const idSchema = z.uuid();

function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
  };
}

// Every trip, the latest first; the page groups them by status
export async function listTrips(): Promise<Trip[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_COLUMNS)
    .order("starts_on", { ascending: false });
  if (error) throw new Error("Could not load the trips", { cause: error });
  return data.map(toTrip);
}

// One trip; a bad id or someone else's trip is a 404
export async function getTrip(id: string): Promise<Trip> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load the trip", { cause: error });
  if (!data) notFound();
  return toTrip(data);
}

// What each trip spent, per currency; a trip with no expenses has no entry
export async function listTripSpending(): Promise<Record<string, Money[]>> {
  await requireUser();
  const supabase = await createClient();
  const rows: TripSpendRow[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("trip_id, amount_minor, currency")
      .eq("kind", "expense")
      .is("deleted_at", null)
      .not("trip_id", "is", null)
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) {
      throw new Error("Could not load what the trips spent", { cause: error });
    }
    for (const record of data) {
      // The database checks this value, so anything else is a bug
      if (!isCurrencyCode(record.currency)) {
        throw new Error(`Unexpected transaction currency: ${record.currency}`);
      }
      if (record.trip_id !== null) {
        rows.push({
          tripId: record.trip_id,
          amount: money(record.amount_minor, record.currency),
        });
      }
    }
    if (data.length < PAGE_SIZE) break;
  }
  return Object.fromEntries(spentByTrip(rows));
}

// Every non-deleted income and expense that carries the trip
async function loadTripRows(tripId: string): Promise<SummaryRow[]> {
  const supabase = await createClient();
  const rows: SummaryRow[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("kind, amount_minor, currency, category_id")
      .eq("trip_id", tripId)
      .in("kind", ["income", "expense"])
      .is("deleted_at", null)
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) {
      throw new Error("Could not load the trip's entries", { cause: error });
    }
    for (const record of data) {
      // The database checks this value, so anything else is a bug
      if (!isCurrencyCode(record.currency)) {
        throw new Error(`Unexpected transaction currency: ${record.currency}`);
      }
      rows.push({
        kind: record.kind,
        amount: money(record.amount_minor, record.currency),
        categoryId: record.category_id,
      });
    }
    if (data.length < PAGE_SIZE) return rows;
  }
}

// The trip with its money in and out per currency and where the spending went
export async function getTripPage(id: string): Promise<TripPage> {
  const trip = await getTrip(id);
  const [categories, rows] = await Promise.all([
    listAllCategories(),
    loadTripRows(trip.id),
  ]);
  return {
    trip,
    summaries: monthSummary(
      rows,
      new Map(
        categories.map((category) => [
          category.id,
          { name: category.name, icon: category.icon, color: category.color },
        ]),
      ),
    ),
    entries: rows.length,
  };
}

// Money in and out on the trip's days that has no trip yet
export async function countUnlabelled(trip: Trip): Promise<number> {
  await requireUser();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .in("kind", ["income", "expense"])
    .is("trip_id", null)
    .is("deleted_at", null)
    .gte("transaction_date", trip.startsOn)
    .lte("transaction_date", trip.endsOn);
  if (error) {
    throw new Error("Could not count the unlabelled entries", { cause: error });
  }
  return count ?? 0;
}
