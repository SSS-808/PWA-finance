import { PieChart, Plane, Tag, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import type {
  BudgetsStatus,
  GoalsStatus,
  TripsStatus,
} from "../domain/calculations";
import type { MoreStatus } from "../server/queries";

function budgetsText(status: BudgetsStatus): string {
  if (status.kind === "none") return en.more.budgetsNone;
  if (status.kind === "ok") return en.more.budgetsOk;
  return en.more.budgetsOver.replace("{n}", String(status.count));
}

function goalsText(status: GoalsStatus): string {
  if (status.kind === "none") return en.more.goalsNone;
  if (status.kind === "one") {
    return en.more.goalsOne.replace("{percent}", String(status.percent));
  }
  return en.more.goalsMany.replace("{n}", String(status.count));
}

function tripsText(status: TripsStatus): string {
  switch (status.kind) {
    case "none":
      return en.more.tripsNone;
    case "now":
      return en.more.tripsNow.replace("{name}", status.name);
    case "next":
      return en.more.tripsNext.replace("{name}", status.name);
    case "one":
      return en.more.tripsOne;
    case "many":
      return en.more.tripsMany.replace("{n}", String(status.count));
  }
}

function Tile({
  href,
  icon: Icon,
  iconClass,
  name,
  status,
  statusClass,
}: {
  href: string;
  icon: LucideIcon;
  iconClass: string;
  name: string;
  status: string;
  statusClass?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full min-h-28 flex-col gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-11 items-center justify-center rounded-full",
            iconClass,
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="space-y-0.5">
          <span className="block text-base font-semibold">{name}</span>
          <span
            className={cn(
              "block text-sm break-words text-muted-foreground",
              statusClass,
            )}
          >
            {status}
          </span>
        </span>
      </Link>
    </li>
  );
}

// The four feature tiles of the More page, each with a one-line status
export function MoreTiles({ status }: { status: MoreStatus }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      <Tile
        href="/budgets"
        icon={PieChart}
        iconClass="bg-cat-orange-soft text-cat-orange"
        name={en.budgets.title}
        status={budgetsText(status.budgets)}
        statusClass={
          status.budgets.kind === "over" ? "text-expense" : undefined
        }
      />
      <Tile
        href="/goals"
        icon={Target}
        iconClass="bg-cat-green-soft text-cat-green"
        name={en.goals.title}
        status={goalsText(status.goals)}
      />
      <Tile
        href="/trips"
        icon={Plane}
        iconClass="bg-cat-indigo-soft text-cat-indigo"
        name={en.trips.title}
        status={tripsText(status.trips)}
      />
      <Tile
        href="/settings/categories"
        icon={Tag}
        iconClass="bg-cat-pink-soft text-cat-pink"
        name={en.settings.categories.title}
        status={en.more.categories}
      />
    </ul>
  );
}
