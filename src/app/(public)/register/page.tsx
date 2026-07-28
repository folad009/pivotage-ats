import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Candidate registration</h1>
        <p className="text-muted-foreground text-sm">
          Create an account to apply for open positions.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
