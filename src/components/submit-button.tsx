"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
};

export function SubmitButton({ children, pendingLabel = "Working...", className = "button" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
