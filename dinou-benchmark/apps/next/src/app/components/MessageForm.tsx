"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { submitMessage, type FormState } from "@/app/actions";

const initialState: FormState = { ok: true, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} data-testid="submit">
      {pending ? "Guardando…" : "Enviar"}
    </button>
  );
}

export function MessageForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(submitMessage, initialState);

  // Tras una mutación correcta se refresca el árbol RSC para que la lista
  // vuelva a leer el JSON local sin recargar el navegador.
  useEffect(() => {
    if (state.ok && state.message) router.refresh();
  }, [state, router]);

  return (
    <>
      <form className="form" action={formAction} data-testid="message-form">
        <input name="author" placeholder="autor" defaultValue="operador" maxLength={24} />
        <input name="body" placeholder="Escribe un mensaje…" maxLength={280} required />
        <SubmitButton />
      </form>
      {state.message ? (
        <p className="feedback" data-ok={String(state.ok)} data-testid="feedback">
          {state.message}
        </p>
      ) : null}
    </>
  );
}

