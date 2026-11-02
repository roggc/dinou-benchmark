import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

export async function getHsL1LayoutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-l1-layout-tag", "layout:/rigorous/hs", "subtree:/rigorous/hs");
  return getRigorousState();
}

export async function getHsIndexPageState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-index-page-tag", "page:/rigorous/hs", "subtree:/rigorous/hs");
  return getRigorousState();
}

export async function getHsNestedLayoutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hs-l2-layout-tag",
    "layout:/rigorous/hs/nested",
    "subtree:/rigorous/hs/nested",
    "subtree:/rigorous/hs"
  );
  return getRigorousState();
}

export async function getHsNestedPage1State() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-nested-page1-tag", "page:/rigorous/hs/nested", "subtree:/rigorous/hs/nested");
  return getRigorousState();
}

export async function getHsNestedPage2State() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hs-nested-page2-tag",
    "page:/rigorous/hs/nested/page-2",
    "subtree:/rigorous/hs/nested/page-2"
  );
  return getRigorousState();
}

export async function getHsSiblingAState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-sibling-a-tag", "page:/rigorous/hs/sibling-a", "subtree:/rigorous/hs/sibling-a");
  return getRigorousState();
}

export async function getHsSiblingBState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hs-sibling-b-tag", "page:/rigorous/hs/sibling-b", "subtree:/rigorous/hs/sibling-b");
  return getRigorousState();
}

export async function getHsTtlChildPageState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("page:/rigorous/hs/ttl-layout");
  return getRigorousState();
}

export async function getCsStaticHostPageState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "cs-static-page-tag",
    "page:/rigorous/cache-slot/static-host",
    "subtree:/rigorous/cache-slot/static-host"
  );
  return getRigorousState();
}

export async function getCsStaticHostSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-static-slot", "slot:cs-slot-static-host", "slot:*");
  return getRigorousState();
}

export async function getCsBannerSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-banner", "slot:cs-layout-banner", "slot:*");
  return getRigorousState();
}

export async function getCsAlphaSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-alpha", "slot:cs-slot-alpha", "slot:*");
  return getRigorousState();
}

export async function getCsBetaSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-beta", "cs-tag-shared", "slot:cs-slot-beta", "slot:*");
  return getRigorousState();
}

export async function getCsGammaSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-gamma", "cs-tag-shared", "slot:cs-slot-gamma", "slot:*");
  return getRigorousState();
}

export async function getCsTagOnlySlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-only", "slot:cs-tag-only", "slot:*");
  return getRigorousState();
}

export async function getCsNestedInnerSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-nested-inner", "slot:cs-slot-nested-inner", "slot:*");
  return getRigorousState();
}

export async function getCsNestedOuterSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-nested-outer", "slot:cs-slot-nested-outer", "slot:*");
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
  const snap = { ...s };
  if (snap.hscsPageASlotDelayMs > 0) {
    await sleep(snap.hscsPageASlotDelayMs);
  }
  return snap;
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

export async function getHsPprTtlChildShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("page:/rigorous/hs-ppr/ttl-ppr");
  return getRigorousState();
}

export async function getTsL1ShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-l1-layout-tag", "layout:/rigorous/triple", "subtree:/rigorous/triple");
  return getRigorousState();
}

export async function getTsLayoutShellSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-layout-shell-slot", "slot:ts-layout-shell-slot", "slot:*");
  return getRigorousState();
}

export async function getTsPprAShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-ppr-a-tag", "page:/rigorous/triple", "subtree:/rigorous/triple");
  return getRigorousState();
}

export async function getTsPprAShellSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-ppr-a-shell-slot", "slot:ts-ppr-a-shell-slot", "slot:*");
  return getRigorousState();
}

export async function getTsStaticBHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-static-b-tag", "page:/rigorous/triple/static-b", "subtree:/rigorous/triple/static-b");
  return getRigorousState();
}

export async function getTsStaticBSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-static-b-slot", "slot:ts-static-b-slot", "slot:*");
  return getRigorousState();
}

export async function getTsStaticAHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-static-a-tag", "page:/rigorous/triple/static-a", "subtree:/rigorous/triple/static-a");
  return getRigorousState();
}

export async function getTsStaticASlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-static-a-slot", "slot:ts-static-a-slot", "slot:*");
  return getRigorousState();
}

export async function getTsPprAHoleSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-ppr-a-hole-slot", "slot:ts-ppr-a-hole-slot", "slot:*");
  return getRigorousState();
}

export async function getTsHoleNestedInnerState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-hole-nested-inner", "slot:ts-hole-nested-inner", "slot:*");
  return getRigorousState();
}

export async function getTsHoleNestedOuterState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-hole-nested-outer", "slot:ts-hole-nested-outer", "slot:*");
  return getRigorousState();
}

export async function getTsL2ShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "ts-l2-layout-tag",
    "layout:/rigorous/triple/nested",
    "subtree:/rigorous/triple/nested",
    "subtree:/rigorous/triple"
  );
  return getRigorousState();
}

export async function getTsNestedLayoutSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-nested-layout-slot", "slot:ts-nested-layout-slot", "slot:*");
  return getRigorousState();
}

export async function getTsNestedPprShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "ts-nested-ppr-page-tag",
    "page:/rigorous/triple/nested",
    "subtree:/rigorous/triple/nested"
  );
  return getRigorousState();
}

export async function getTsNestedPprShellSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-nested-ppr-shell-slot", "slot:ts-nested-ppr-shell-slot", "slot:*");
  return getRigorousState();
}

export async function getTsNestedPprHoleSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-nested-ppr-hole-slot", "slot:ts-nested-ppr-hole-slot", "slot:*");
  return getRigorousState();
}

export async function getTsNestedStaticHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "ts-nested-static-child-tag",
    "page:/rigorous/triple/nested/static-child",
    "subtree:/rigorous/triple/nested/static-child"
  );
  return getRigorousState();
}

export async function getTsNestedStaticSlotState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-nested-static-slot", "slot:ts-nested-static-slot", "slot:*");
  return getRigorousState();
}

export async function warmNextUseCacheBaseline() {
  await Promise.all([
    getHsL1LayoutState(),
    getHsIndexPageState(),
    getHsNestedLayoutState(),
    getHsNestedPage1State(),
    getHsNestedPage2State(),
    getHsSiblingAState(),
    getHsSiblingBState(),
    getHsTtlChildPageState(),
    getCsStaticHostPageState(),
    getCsStaticHostSlotState(),
    getCsBannerSlotState(),
    getCsAlphaSlotState(),
    getCsBetaSlotState(),
    getCsGammaSlotState(),
    getCsTagOnlySlotState(),
    getCsNestedInnerSlotState(),
    getCsNestedOuterSlotState(),
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
    getHsPprTtlChildShellState(),
    getTsL1ShellState(),
    getTsLayoutShellSlotState(),
    getTsPprAShellState(),
    getTsPprAShellSlotState(),
    getTsPprAHoleSlotState(),
    getTsHoleNestedInnerState(),
    getTsHoleNestedOuterState(),
    getTsStaticAHostState(),
    getTsStaticASlotState(),
    getTsStaticBHostState(),
    getTsStaticBSlotState(),
    getTsL2ShellState(),
    getTsNestedLayoutSlotState(),
    getTsNestedPprShellState(),
    getTsNestedPprShellSlotState(),
    getTsNestedPprHoleSlotState(),
    getTsNestedStaticHostState(),
    getTsNestedStaticSlotState(),
  ]);
}
