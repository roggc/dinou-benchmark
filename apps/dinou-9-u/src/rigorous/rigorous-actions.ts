"use server";

import {
  revalidateLayout,
  revalidatePage,
  revalidatePath,
  revalidateTag,
} from "dinou/server";
import {
  bumpRigorousKeys,
  getRigorousState,
  mutateRigorousState,
  resetRigorousState,
  type RigorousState,
} from "@/shared/lib/rigorous-state";

export async function rigorousGetState(): Promise<RigorousState> {
  return getRigorousState();
}

export async function rigorousMutateState(patch: Partial<RigorousState>): Promise<RigorousState> {
  return mutateRigorousState(patch);
}

export async function rigorousBumpKeys(
  keys: (keyof RigorousState)[],
  delta = 1
): Promise<RigorousState> {
  return bumpRigorousKeys(keys, delta);
}

export async function rigorousResetState(): Promise<RigorousState> {
  return resetRigorousState();
}

export async function rigorousRevalidateTag(tag: string): Promise<{ ok: true; tag: string }> {
  await revalidateTag(tag);
  return { ok: true, tag };
}

export async function rigorousRevalidatePage(path: string): Promise<{ ok: true; path: string }> {
  await revalidatePage(path);
  return { ok: true, path };
}

export async function rigorousRevalidateLayout(path: string): Promise<{ ok: true; path: string }> {
  await revalidateLayout(path);
  return { ok: true, path };
}

export async function rigorousRevalidatePath(path: string): Promise<{ ok: true; path: string }> {
  await revalidatePath(path);
  return { ok: true, path };
}

export async function rigorousSlotServerPing(label: string) {
  const next = bumpRigorousKeys(["serverActionPingCount"]);
  return {
    ok: true as const,
    pong: `pong:${label}:#${next.serverActionPingCount}`,
    pingCount: next.serverActionPingCount,
  };
}
