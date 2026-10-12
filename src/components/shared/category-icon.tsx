import {
  Baby,
  Briefcase,
  Car,
  Coffee,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  PawPrint,
  Plane,
  Shirt,
  ShoppingBag,
  Smartphone,
  Store,
  Tag,
  TrendingUp,
  Tv,
  Utensils,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryColor, CategoryIconKey } from "@/modules/categories";

const ICONS: Record<CategoryIconKey, LucideIcon> = {
  tag: Tag,
  utensils: Utensils,
  car: Car,
  "graduation-cap": GraduationCap,
  tv: Tv,
  "shopping-bag": ShoppingBag,
  zap: Zap,
  "heart-pulse": HeartPulse,
  plane: Plane,
  ellipsis: Ellipsis,
  briefcase: Briefcase,
  laptop: Laptop,
  store: Store,
  "trending-up": TrendingUp,
  gift: Gift,
  house: House,
  shirt: Shirt,
  coffee: Coffee,
  fuel: Fuel,
  smartphone: Smartphone,
  baby: Baby,
  "paw-print": PawPrint,
  dumbbell: Dumbbell,
  wrench: Wrench,
};

// Tailwind only sees whole class names, so every colour is spelled out
const TINT: Record<CategoryColor, string> = {
  gray: "bg-cat-gray-soft text-cat-gray",
  orange: "bg-cat-orange-soft text-cat-orange",
  blue: "bg-cat-blue-soft text-cat-blue",
  violet: "bg-cat-violet-soft text-cat-violet",
  pink: "bg-cat-pink-soft text-cat-pink",
  teal: "bg-cat-teal-soft text-cat-teal",
  amber: "bg-cat-amber-soft text-cat-amber",
  rose: "bg-cat-rose-soft text-cat-rose",
  indigo: "bg-cat-indigo-soft text-cat-indigo",
  green: "bg-cat-green-soft text-cat-green",
};

const BAR: Record<CategoryColor, string> = {
  gray: "bg-cat-gray",
  orange: "bg-cat-orange",
  blue: "bg-cat-blue",
  violet: "bg-cat-violet",
  pink: "bg-cat-pink",
  teal: "bg-cat-teal",
  amber: "bg-cat-amber",
  rose: "bg-cat-rose",
  indigo: "bg-cat-indigo",
  green: "bg-cat-green",
};

// An unknown key (a stale value) falls back to the tag icon and the gray classes
function isIconKey(key: string): key is CategoryIconKey {
  return Object.hasOwn(ICONS, key);
}

function isColorKey(key: string): key is CategoryColor {
  return Object.hasOwn(BAR, key);
}

export function categoryBarClass(color: string): string {
  return BAR[isColorKey(color) ? color : "gray"];
}

// A round badge with the category's icon; sm fits inside a chip
export function CategoryIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string;
  color: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = ICONS[isIconKey(icon) ? icon : "tag"];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "sm" ? "size-7" : "size-10",
        TINT[isColorKey(color) ? color : "gray"],
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-4" : "size-5"} />
    </span>
  );
}
