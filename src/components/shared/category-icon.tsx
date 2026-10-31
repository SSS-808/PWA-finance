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
  Landmark,
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
  landmark: Landmark,
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

// The picked category is a solid circle in its colour
const SOLID: Record<CategoryColor, string> = {
  gray: "bg-cat-gray text-card",
  orange: "bg-cat-orange text-card",
  blue: "bg-cat-blue text-card",
  violet: "bg-cat-violet text-card",
  pink: "bg-cat-pink text-card",
  teal: "bg-cat-teal text-card",
  amber: "bg-cat-amber text-card",
  rose: "bg-cat-rose text-card",
  indigo: "bg-cat-indigo text-card",
  green: "bg-cat-green text-card",
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

const BADGE_SIZE = { sm: "size-7", md: "size-10", lg: "size-12" };
const ICON_SIZE = { sm: "size-4", md: "size-5", lg: "size-5" };

// A round badge with the category's icon; solid fills it with its colour
export function CategoryIcon({
  icon,
  color,
  size = "md",
  solid = false,
  className,
}: {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  solid?: boolean;
  className?: string;
}) {
  const Icon = ICONS[isIconKey(icon) ? icon : "tag"];
  const key = isColorKey(color) ? color : "gray";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        BADGE_SIZE[size],
        solid ? SOLID[key] : TINT[key],
        className,
      )}
    >
      <Icon className={ICON_SIZE[size]} />
    </span>
  );
}
