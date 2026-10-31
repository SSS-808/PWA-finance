import {
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountType } from "../domain/account-types";

const ICONS: Record<AccountType, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  loan: HandCoins,
  investment: TrendingUp,
  other: Wallet,
};

// A round icon for the account type; "hero" is for the emerald card
export function AccountTypeIcon({
  type,
  tone = "soft",
}: {
  type: AccountType;
  tone?: "soft" | "hero";
}) {
  const Icon = ICONS[type];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        tone === "hero"
          ? "size-11 border border-hero-border text-hero-foreground"
          : "size-10 bg-primary-soft text-primary",
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}
