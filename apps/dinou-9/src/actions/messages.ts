"use server";

import { revalidatePath } from "dinou/server";
import { appendMessage } from "@/shared/lib/store";

export type FormState = { ok: boolean; message: string };

/**
 * Dinou Server Function: module-level "use server" directive.
 * Client components import it directly (passing as a prop
 * caused HTTP 400 in 8.0.1 — see README).
 */
export async function submitMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const body = String(formData.get("body") ?? "").trim();
  const author = String(formData.get("author") ?? "operator").trim() || "operator";

  if (!body) {
    return { ok: false, message: "Write a message before submitting." };
  }
  if (body.length > 280) {
    return { ok: false, message: "Maximum 280 characters." };
  }

  await appendMessage(author, body);
  // Invalidate cached HTML and RSC payload for /messages.
  await revalidatePath("/messages");

  return { ok: true, message: `Saved (${body.length} characters).` };
}

