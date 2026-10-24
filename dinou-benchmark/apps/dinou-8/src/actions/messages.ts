"use server";

import { revalidatePath } from "dinou/server";
import { appendMessage } from "@/shared/lib/store";

export type FormState = { ok: boolean; message: string };

/**
 * Server Function de Dinou: directiva "use server" a nivel de módulo.
 * El componente de cliente la importa directamente (pasarla como prop
 * provocaba HTTP 400 en 8.0.1 — ver README → "Diferencias").
 */
export async function submitMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const body = String(formData.get("body") ?? "").trim();
  const author = String(formData.get("author") ?? "operador").trim() || "operador";

  if (!body) {
    return { ok: false, message: "Escribe un mensaje antes de enviar." };
  }
  if (body.length > 280) {
    return { ok: false, message: "Máximo 280 caracteres." };
  }

  await appendMessage(author, body);
  // Invalida el HTML y el payload RSC cacheados de /messages.
  await revalidatePath("/messages");

  return { ok: true, message: `Guardado (${body.length} caracteres).` };
}

