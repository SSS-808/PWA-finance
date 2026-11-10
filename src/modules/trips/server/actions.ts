"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { fieldErrorsFrom, tripSchema } from "../domain/schemas";
import type {
  TripErrorKey,
  TripFormState,
  TripFormValues,
} from "../domain/types";

const LIST_PATH = "/trips";

const idSchema = z.uuid();

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readValues(formData: FormData): TripFormValues {
  return {
    name: textField(formData, "name"),
    startsOn: textField(formData, "startsOn"),
    endsOn: textField(formData, "endsOn"),
  };
}

function logDatabaseError(
  message: string,
  error: { code: string; message: string },
) {
  console.error(message, { code: error.code, message: error.message });
}

// 23P01 is the rule that two trips can't share a day, 23514 a last day before the first
function databaseErrorKey(code: string): TripErrorKey {
  if (code === "23P01") return "dates_overlap";
  if (code === "23514") return "dates_out_of_order";
  return "unknown";
}

export async function createTrip(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  await requireUser();
  const values = readValues(formData);
  const parsed = tripSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      name: parsed.data.name,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
    })
    .select("id")
    .single();
  if (error) {
    logDatabaseError("Could not create the trip", error);
    return { status: "error", error: databaseErrorKey(error.code), values };
  }

  redirect(`${LIST_PATH}/${data.id}?notice=added`);
}

export async function updateTrip(
  id: string,
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();
  const values = readValues(formData);
  const parsed = tripSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .update({
      name: parsed.data.name,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
    })
    .eq("id", id)
    .select("id");
  if (error) {
    logDatabaseError("Could not update the trip", error);
    return { status: "error", error: databaseErrorKey(error.code), values };
  }
  if (data.length === 0) {
    return { status: "error", error: "not_found", values };
  }

  redirect(`${LIST_PATH}/${id}?notice=saved`);
}

// The entries keep their place in History; the database only clears their trip label
export async function deleteTrip(id: string): Promise<void> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    logDatabaseError("Could not delete the trip", error);
    throw new Error("Could not delete the trip", { cause: error });
  }
  if (data.length === 0) notFound();

  redirect(`${LIST_PATH}?notice=deleted`);
}

// Gives the trip to the money in and out of its days that has none; the database counts what it labelled
export async function labelTripEntries(tripId: string): Promise<void> {
  await requireUser();
  if (!idSchema.safeParse(tripId).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("label_trip_entries", {
    p_trip_id: tripId,
  });
  // P0002 is raised when the trip isn't there or isn't the person's
  if (error?.code === "P0002") notFound();
  if (error) {
    logDatabaseError("Could not label the trip's entries", error);
    throw new Error("Could not label the trip's entries", { cause: error });
  }

  redirect(`${LIST_PATH}/${tripId}?notice=labelled&count=${data}`);
}
