import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

export async function getHsL1LayoutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-l1-layout-tag", "layout:/rigorous/hs", "subtree:/rigorous/hs");
  return getRigorousState();
}

export async function getHsSiblingBState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-sibling-b-tag", "page:/rigorous/hs/sibling-b", "subtree:/rigorous/hs/sibling-b");
  return getRigorousState();
}

export async function getHscsL1LayoutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hscs-l1-layout-tag",
    "layout:/rigorous/hs-cache-slot",
    "subtree:/rigorous/hs-cache-slot"
  );
  return getRigorousState();
}

export async function getHscsL1SlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-l1-slot", "slot:hscs-l1-slot", "slot:*");
  return getRigorousState();
}

export async function getHscsL1SharedSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-shared", "slot:hscs-l1-shared-slot", "slot:*");
  return getRigorousState();
}

export async function getHscsL1OuterSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-l1-outer", "slot:hscs-l1-outer-slot", "slot:*");
  return getRigorousState();
}

export async function getHscsL1InnerSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-l1-inner", "slot:hscs-l1-inner-slot", "slot:*");
  return getRigorousState();
}

export async function getHscsSidebarHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hscs-l1-layout-tag",
    "layout:/rigorous/hs-cache-slot",
    "subtree:/rigorous/hs-cache-slot"
  );
  return getRigorousState();
}

export async function getHscsSidebarSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-sidebar-slot", "slot:hscs-sidebar-slot", "slot:*");
  return getRigorousState();
}

export async function getHscsPageAHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hscs-page-a-tag",
    "page:/rigorous/hs-cache-slot",
    "subtree:/rigorous/hs-cache-slot"
  );
  return getRigorousState();
}

export async function getHscsPageASlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-page-a-slot", "slot:hscs-page-a-slot", "slot:*");
  const s = getRigorousState();
  if (s.hscsPageASlotDelayMs > 0) {
    await sleep(s.hscsPageASlotDelayMs);
  }
  return s;
}

export async function getHscsPageASharedSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-shared", "slot:hscs-page-a-shared-slot", "slot:*");
  return getRigorousState();
}

export async function getHscsPageAOuterSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-page-a-outer", "slot:hscs-page-a-outer-slot", "slot:*");
  return getRigorousState();
}

export async function getHscsPageAInnerSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-page-a-inner", "slot:hscs-page-a-inner-slot", "slot:*");
  return getRigorousState();
}

export async function getHscsPageBHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hscs-page-b-tag",
    "page:/rigorous/hs-cache-slot/page-b",
    "subtree:/rigorous/hs-cache-slot/page-b"
  );
  return getRigorousState();
}

export async function getHscsPageBSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-page-b-slot", "slot:hscs-page-b-slot", "slot:*");
  return getRigorousState();
}

export async function getHsPprL1ShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hsppr-l1-layout-tag",
    "layout:/rigorous/hs-ppr",
    "subtree:/rigorous/hs-ppr"
  );
  return getRigorousState();
}

export async function getHsPprSidebarShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hsppr-l1-layout-tag",
    "layout:/rigorous/hs-ppr",
    "subtree:/rigorous/hs-ppr"
  );
  return getRigorousState();
}

export async function getHsPprPageAShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hsppr-page-a-tag", "page:/rigorous/hs-ppr", "subtree:/rigorous/hs-ppr");
  return getRigorousState();
}

export async function getHsPprPageAStaticSuspenseState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hsppr-page-a-tag", "page:/rigorous/hs-ppr", "subtree:/rigorous/hs-ppr");
  await sleep(5);
  return getRigorousState();
}

export async function warmNextUseCacheBaseline() {
  await Promise.all([
    getHsL1LayoutState(),
    getHsSiblingBState(),
    getHscsL1LayoutState(),
    getHscsL1SlotState(),
    getHscsL1SharedSlotState(),
    getHscsL1OuterSlotState(),
    getHscsL1InnerSlotState(),
    getHscsSidebarHostState(),
    getHscsSidebarSlotState(),
    getHscsPageAHostState(),
    getHscsPageASlotState(),
    getHscsPageASharedSlotState(),
    getHscsPageAOuterSlotState(),
    getHscsPageAInnerSlotState(),
    getHscsPageBHostState(),
    getHscsPageBSlotState(),
    getHsPprL1ShellState(),
    getHsPprSidebarShellState(),
    getHsPprPageAShellState(),
    getHsPprPageAStaticSuspenseState(),
  ]);
}

