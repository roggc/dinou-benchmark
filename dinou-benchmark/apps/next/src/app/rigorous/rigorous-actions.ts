"use server";

import { updateTag } from "next/cache";
import {
  bumpRigorousKeys,
  getRigorousState,
  mutateRigorousState,
  resetRigorousState,
  type RigorousState,
} from "@/shared/lib/rigorous-state";
import { warmNextUseCacheBaseline } from "./next-cached-segments";

const RESET_TAGS = [
  "hs-l1-layout-tag",
  "layout:/rigorous/hs",
  "hs-sibling-b-tag",
  "page:/rigorous/hs/sibling-b",
  "hscs-l1-layout-tag",
  "layout:/rigorous/hs-cache-slot",
  "hscs-page-a-tag",
  "page:/rigorous/hs-cache-slot",
  "hscs-page-b-tag",
  "page:/rigorous/hs-cache-slot/page-b",
  "hscs-tag-shared",
  "hscs-tag-page-a-slot",
  "slot:hscs-page-a-slot",
  "hsppr-l1-layout-tag",
  "layout:/rigorous/hs-ppr",
  "hsppr-page-a-tag",
  "page:/rigorous/hs-ppr",
];

export async function rigorousGetState(): Promise<RigorousState> {
  return getRigorousState();
}

export async function rigorousMutateState(
  patch: Partial<RigorousState>
): Promise<RigorousState> {
  return mutateRigorousState(patch);
}

export async function rigorousBumpKeys(
  keys: (keyof RigorousState)[],
  delta = 1
): Promise<RigorousState> {
  return bumpRigorousKeys(keys, delta);
}

export async function rigorousResetState(): Promise<RigorousState> {
  const s = resetRigorousState();
  for (const tag of RESET_TAGS) {
    updateTag(tag);
  }
  await warmNextUseCacheBaseline();
  return s;
}

export async function rigorousRevalidateTag(tag: string) {
  updateTag(tag);
  return { ok: true as const, tag };
}

export async function rigorousRevalidatePage(path: string) {
  updateTag(`page:${path}`);
  return { ok: true as const, path };
}

export async function rigorousRevalidateLayout(path: string) {
  updateTag(`layout:${path}`);
  return { ok: true as const, path };
}

export async function rigorousRevalidatePath(path: string) {
  updateTag(`subtree:${path}`);
  updateTag(`layout:${path}`);
  updateTag(`page:${path}`);
  return { ok: true as const, path };
}

export async function rigorousNextRefreshSlot(idOrTag: string) {
  updateTag(`slot:${idOrTag}`);
  updateTag(idOrTag);
  return { ok: true as const, idOrTag };
}

export async function rigorousSlotServerPing(label: string) {
  const next = bumpRigorousKeys(["serverActionPingCount"]);
  return {
    ok: true as const,
    pong: `pong:${label}:#${next.serverActionPingCount}`,
    pingCount: next.serverActionPingCount,
  };
}
