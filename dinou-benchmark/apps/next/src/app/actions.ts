"use server";

import { revalidatePath } from "next/cache";
import { appendMessage } from "@/shared/lib/store";

export type FormState = { ok: boolean; message: string };

/**
 * Server Action de Next.js. Igual que en Dinou, el componente de cliente la
 * importa directamente en lugar de recibirla como prop.
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
  revalidatePath("/messages");

  return { ok: true, message: `Guardado (${body.length} caracteres).` };
}

