"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { btn } from "@/components/ui/button";
import type { ActionState } from "@/app/admin/(painel)/actions";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/** Formulário ligado a uma server action, com aviso de sucesso/erro embaixo. */
export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  /** Pergunta antes de enviar (ex.: "Cancelar este agendamento?"). */
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="mt-2 text-sm text-success">{state.ok}</p>}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: React.ReactNode;
  variant?: Parameters<typeof btn>[0];
  size?: Parameters<typeof btn>[1];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btn(variant, size, className)}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
