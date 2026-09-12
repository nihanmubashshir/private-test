import type { ReactNode } from "react";
import { Alert } from "./alert";

export interface FormErrorProps {
  tone?: "danger" | "warning";
  children: ReactNode;
}

/** An Alert with role="alert" — one per form, placed directly above the submit button. */
export function FormError({ tone = "danger", children }: FormErrorProps) {
  return (
    <Alert tone={tone} role="alert">
      {children}
    </Alert>
  );
}
