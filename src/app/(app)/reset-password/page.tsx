import { en } from "@/messages/en";
import { AuthShell, ResetPasswordForm } from "@/modules/auth";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      embedded
      title={en.auth.reset.title}
      description={en.auth.reset.description}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
