import { AuthShell } from "@/components/auth/auth-shell/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form/login-form";

export function LoginScreen() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
