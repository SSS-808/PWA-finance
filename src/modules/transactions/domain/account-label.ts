import { currencySymbol } from "@/modules/money";
import type { AccountOption } from "./types";

type Labelled = Pick<AccountOption, "id" | "name" | "currency">;

// A name used by several accounts gets its currency symbol, like "BCEL · ₭"
export function accountLabel(
  option: Labelled,
  options: readonly Labelled[],
): string {
  const key = option.name.toLowerCase();
  const shared = options.some(
    (other) => other.id !== option.id && other.name.toLowerCase() === key,
  );
  return shared
    ? `${option.name} · ${currencySymbol(option.currency)}`
    : option.name;
}
