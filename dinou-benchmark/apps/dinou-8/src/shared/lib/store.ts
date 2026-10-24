import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Message = {
  id: number;
  author: string;
  body: string;
  at: string;
};

/** Almacén local en disco: sin base de datos y sin red, igual en ambos frameworks. */
const storeFile = path.join(process.cwd(), "data", "messages.json");

export async function readMessages(): Promise<Message[]> {
  try {
    const raw = JSON.parse(await readFile(storeFile, "utf8")) as { messages?: Message[] };
    return Array.isArray(raw.messages) ? raw.messages : [];
  } catch {
    return [];
  }
}

export async function appendMessage(author: string, body: string): Promise<Message> {
  const messages = await readMessages();
  const message: Message = {
    id: (messages.at(-1)?.id ?? 0) + 1,
    author,
    body,
    at: new Date().toISOString(),
  };
  messages.push(message);
  await mkdir(path.dirname(storeFile), { recursive: true });
  await writeFile(storeFile, JSON.stringify({ messages }, null, 2) + "\n", "utf8");
  return message;
}

