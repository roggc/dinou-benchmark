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
      {pending ? "Saving…" : "Send"}
    </button>
  );
}

export function MessageForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, FormData>(submitMessage, initialState);

  // After a successful mutation, the RSC tree is refreshed so the list
  // re-reads local JSON without reloading the browser.
  useEffect(() => {
    if (state.ok && state.message) router.refresh();
  }, [state, router]);

  return (
    <>
      <form className="form" action={formAction} data-testid="message-form">
        <input name="author" placeholder="author" defaultValue="operator" maxLength={24} />
        <input name="body" placeholder="Write a message…" maxLength={280} required />
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

