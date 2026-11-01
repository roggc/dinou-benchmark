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
  "hs-sibling-a-tag",
  "page:/rigorous/hs/sibling-a",
  "hs-sibling-b-tag",
  "page:/rigorous/hs/sibling-b",
  "page:/rigorous/hs/ttl-layout",
  "cs-static-page-tag",
  "page:/rigorous/cache-slot/static-host",
  "cs-tag-static-slot",
  "cs-tag-banner",
  "cs-tag-alpha",
  "cs-tag-beta",
  "cs-tag-gamma",
  "cs-tag-shared",
  "cs-tag-only",
  "cs-tag-nested-inner",
  "cs-tag-nested-outer",
  "cs-tag-stampede",
  "slot:cs-slot-stampede",
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
  "page:/rigorous/hs-ppr/ttl-ppr",
  "ts-l1-layout-tag",
  "layout:/rigorous/triple",
  "ts-tag-layout-shell-slot",
  "ts-ppr-a-tag",
  "page:/rigorous/triple",
  "ts-tag-ppr-a-shell-slot",
  "ts-tag-ppr-a-hole-slot",
  "ts-tag-hole-nested-inner",
  "ts-tag-hole-nested-outer",
  "ts-static-a-tag",
  "page:/rigorous/triple/static-a",
  "ts-tag-static-a-slot",
  "ts-static-b-tag",
  "page:/rigorous/triple/static-b",
  "ts-tag-static-b-slot",
  "ts-l2-layout-tag",
  "layout:/rigorous/triple/nested",
  "ts-tag-nested-layout-slot",
  "ts-nested-ppr-page-tag",
  "page:/rigorous/triple/nested",
  "ts-tag-nested-ppr-shell-slot",
  "ts-tag-nested-ppr-hole-slot",
  "ts-nested-static-child-tag",
  "page:/rigorous/triple/nested/static-child",
  "ts-tag-nested-static-slot",
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
  return s;
}

export async function rigorousWarmBaseline(): Promise<RigorousState> {
  const s = resetRigorousState();
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
