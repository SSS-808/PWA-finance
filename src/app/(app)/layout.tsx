import { AppNav } from "@/components/shared/app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:flex">
      <AppNav />
      <main className="flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pb-8">{children}</main>
    </div>
  );
}
