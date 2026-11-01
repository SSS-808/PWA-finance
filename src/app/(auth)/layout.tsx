import { ForgetSavedPages } from "@/components/shared/offline";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <ForgetSavedPages />
    </>
  );
}
