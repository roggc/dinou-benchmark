"use server";

import { revalidatePath } from "next/cache";
import { appendMessage } from "@/shared/lib/store";

export type FormState = { ok: boolean; message: string };

/**
 * Next.js Server Action. Identical to Dinou, the client component
 * imports it directly rather than receiving it as a prop.
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
  revalidatePath("/messages");

  return { ok: true, message: `Saved (${body.length} characters).` };
}

