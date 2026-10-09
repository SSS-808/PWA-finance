import { Suspense } from "react";
import { AppNav, AppNavFrame } from "@/components/shared/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:flex">
      {/* The bar shows at once; the current tab is highlighted when the address is known */}
      <Suspense fallback={<AppNavFrame pathname={null} />}>
        <AppNav />
      </Suspense>
      <main className="flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pb-8">{children}</main>
    </div>
  );
}
