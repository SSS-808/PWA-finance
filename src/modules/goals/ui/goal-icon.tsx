import { Check, Target } from "lucide-react";
import { cn } from "@/lib/utils";

// A round badge for a goal: a target, or a tick once it is reached
export function GoalIcon({ reached }: { reached: boolean }) {
  const Icon = reached ? Check : Target;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        reached ? "bg-income-soft text-income" : "bg-primary-soft text-primary",
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}
