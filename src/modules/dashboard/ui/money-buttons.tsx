import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { en } from "@/messages/en";

const buttonClass =
  "flex h-14 items-center justify-center gap-2 rounded-xl text-base font-semibold";

// Home's two shortcuts: Add opens with the kind already chosen and returns to Home
export function MoneyButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/transactions/new?kind=income&from=%2F"
        className={`${buttonClass} bg-income-soft text-income`}
      >
        <Plus className="size-5" aria-hidden="true" />
        {en.home.moneyIn}
      </Link>
      <Link
        href="/transactions/new?kind=expense&from=%2F"
        className={`${buttonClass} bg-expense-soft text-expense`}
      >
        <Minus className="size-5" aria-hidden="true" />
        {en.home.moneyOut}
      </Link>
    </div>
  );
}
