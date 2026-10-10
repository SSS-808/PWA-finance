import { en } from "@/messages/en";
import { AuthShell, SignupForm } from "@/modules/auth";

export default function SignupPage() {
  return (
    <AuthShell title={en.auth.signup.title}>
      <SignupForm />
    </AuthShell>
  );
}
