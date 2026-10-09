// Matches the type check on the accounts table
export const ACCOUNT_TYPES = [
  "cash",
  "bank",
  "savings",
  "credit_card",
  "loan",
  "investment",
  "other",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

// Debts are typed as what you owe and stored as a negative balance
export function isDebt(type: AccountType): boolean {
  return type === "credit_card" || type === "loan";
}
