"use client";

import { useActionState, useRef } from "react";
import type { KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { BottomCta } from "@/components/shell/bottom-cta";
import { signIn, type SignInFormState } from "./actions";

const initialState: SignInFormState = { message: null, tone: "danger" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const passwordRef = useRef<HTMLInputElement>(null);

  const focusPassword = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    passwordRef.current?.focus();
  };

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-6">
      <h1 className="text-h1 font-semibold text-neutral-50">Sign in</h1>
      <div className="flex flex-col gap-5">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          onKeyDown={focusPassword}
          required
          size="lg"
        />
        <Input
          ref={passwordRef}
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          enterKeyHint="go"
          required
          password
          size="lg"
        />
        {state.message && <FormError tone={state.tone}>{state.message}</FormError>}
      </div>
      <BottomCta className="-mx-4 mt-auto">
        <Button type="submit" fullWidth size="lg" pending={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </BottomCta>
    </form>
  );
}
