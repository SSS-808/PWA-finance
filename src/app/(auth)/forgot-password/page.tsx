import { en } from "@/messages/en";
import { AuthShell, ForgotPasswordForm } from "@/modules/auth";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title={en.auth.forgot.title}
      description={en.auth.forgot.description}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
