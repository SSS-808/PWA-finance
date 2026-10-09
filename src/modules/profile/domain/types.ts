export type ProfileErrorKey =
  "name_too_long" | "invalid_currency" | "invalid_time_zone" | "unknown";

export type ProfileFieldName = "displayName" | "baseCurrency" | "timeZone";

export type ProfileFormValues = Record<ProfileFieldName, string>;

export type ProfileFormState = {
  status: "idle" | "saved" | "error";
  error?: ProfileErrorKey;
  fieldErrors?: Partial<Record<ProfileFieldName, ProfileErrorKey>>;
  values?: ProfileFormValues;
};
