"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { signIn, type SignInFormState } from "./actions";

const initialState: SignInFormState = { message: null, tone: "danger" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 font-semibold text-neutral-50">Sign in</h1>
      <form action={formAction} className="flex flex-col gap-5">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          size="lg"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          password
          size="lg"
        />
        {state.message && <FormError tone={state.tone}>{state.message}</FormError>}
        <Button type="submit" fullWidth size="lg" pending={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
