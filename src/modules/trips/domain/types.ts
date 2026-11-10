export const TRIP_ERROR_KEYS = [
  "name_required",
  "name_too_long",
  "date_invalid",
  "dates_out_of_order",
  "dates_overlap",
  "not_found",
  "unknown",
] as const;

export type TripErrorKey = (typeof TRIP_ERROR_KEYS)[number];

export type TripFieldName = "name" | "startsOn" | "endsOn";

export type TripFormValues = Record<TripFieldName, string>;

// Dates are YYYY-MM-DD strings
export type Trip = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
};

export type TripFormState = {
  status: "idle" | "error";
  error?: TripErrorKey;
  fieldErrors?: Partial<Record<TripFieldName, TripErrorKey>>;
  values?: TripFormValues;
};
