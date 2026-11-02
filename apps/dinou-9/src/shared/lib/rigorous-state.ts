/**
 * Deterministic in-memory state store for the 7 Rigorous Benchmark Suites.
 * Backed by `globalThis[Symbol.for("bench.rigorous.state.v1")]` so that:
 *   1. Build-time SSG/PPR pre-rendering and runtime `start` both initialize
 *      deterministically at baseline `100` with zero disk I/O overhead during autocannon load tests.
 *   2. Server Functions / Actions during `verify.mjs` can surgically bump or poison (`999`)
 *      specific layout, page, or slot counters to verify caching and invalidation invariants.
 */

export type RigorousState = {
  // Suite 1: Horizontal Segmentation (/rigorous/hs)
  hsL1LayoutSeq: number;
  hsL1PropsSeq: number;
  hsIndexPageSeq: number;
  hsIndexPropsSeq: number;
  hsSiblingASeq: number;
  hsSiblingBSeq: number;
  hsL2Seq: number;
  hsBadgeSlotSeq: number;
  hsNestedPage1Seq: number;
  hsNestedPage2Seq: number;
  hsDeptSeq: number;
  hsTtlLayoutSeq: number;
  hsTtlChildPageSeq: number;
  hsTtlPageOnlySeq: number;
  hsResetLayoutSeq: number;
  hsResetPageSeq: number;
  hsNoLayoutSeq: number;
  hsRefreshLabLayoutSeq: number;
  hsRefreshLabPageSeq: number;
  hsTriggerBrokenPage: boolean;

  // Suite 2: Vertical Segmentation / Cache-Slot (/rigorous/cache-slot)
  csLayoutHostSeq: number;
  csBannerSeq: number;
  csBannerLabel: string;
  csDynamicHostSeq: number;
  csAlphaSeq: number;
  csAlphaLabel: string;
  csBetaSeq: number;
  csBetaLabel: string;
  csGammaSeq: number;
  csGammaLabel: string;
  csNoCacheSeq: number;
  csTagOnlySeq: number;
  csNestedOuterSeq: number;
  csNestedInnerSeq: number;
  csFastSeq: number;
  csStampedeExecCount: number;
  csStampedeDelayMs: number;
  csStaticHostSeq: number;
  csStaticSlotSeq: number;
  csStaticFastSeq: number;

  // Suite 3: Rigorous PPR (/rigorous/ppr)
  pprShellSeq: number;
  pprShellLabel: string;
  pprStaticSuspenseSeq: number;
  pprHoleCookieSeq: number;
  pprHoleQuerySeq: number;
  pprHoleClientSeq: number;
  pprOuterStaticSeq: number;
  pprInnerDynamicSeq: number;
  pprOuterDynamicSeq: number;
  pprDeepInnerSeq: number;
  pprMemoHoleSeq: number;
  pprInheritedLayoutSeq: number;
  pprInheritedShellSeq: number;
  pprInheritedHoleSeq: number;
  pprOptOutSeq: number;
  pprTtlShellSeq: number;
  pprTtlHoleSeq: number;

  // Suite 4: Pairwise Synergy #1 — PPR + Cache-Slot (/rigorous/ppr-cache-slot)
  synShellSeq: number;
  synShellLabel: string;
  synShellSlotSeq: number;
  synShellSlotLabel: string;
  synShellTtlSlotSeq: number;
  synStaticSuspSeq: number;
  synStaticSuspSlotSeq: number;
  synStaticSuspSlotLabel: string;
  synHole1HostSeq: number;
  synHoleSlotASeq: number;
  synHoleSlotALabel: string;
  synHoleSlotNoCacheSeq: number;
  synHoleTtlSlotSeq: number;
  synHole2HostSeq: number;
  synNestedOuterSeq: number;
  synNestedOuterLabel: string;
  synNestedInnerSeq: number;
  synNestedInnerLabel: string;
  synHole3HostSeq: number;
  synClientSlotSeq: number;
  synClientSlotLabel: string;

  // Suite 5: Pairwise Synergy #2 — HS + Cache-Slot (/rigorous/hs-cache-slot)
  hscsL1HostSeq: number;
  hscsL1SlotSeq: number;
  hscsL1SlotLabel: string;
  hscsL1SharedSeq: number;
  hscsL1OuterSeq: number;
  hscsL1InnerSeq: number;
  hscsL1TtlSeq: number;
  hscsSidebarHostSeq: number;
  hscsSidebarSlotSeq: number;
  hscsSidebarSlotLabel: string;
  hscsPageAHostSeq: number;
  hscsPageASlotSeq: number;
  hscsPageASlotLabel: string;
  hscsPageASlotDelayMs: number;
  hscsPageASharedSeq: number;
  hscsPageAOuterSeq: number;
  hscsPageAInnerSeq: number;
  hscsPageADynSeq: number;
  hscsPageATtlSeq: number;
  hscsPageBHostSeq: number;
  hscsPageBSlotSeq: number;
  hscsPageBSlotLabel: string;
  hscsL2HostSeq: number;
  hscsL2SlotSeq: number;
  hscsL2SlotLabel: string;
  hscsNestedPageHostSeq: number;
  hscsNestedPageSlotSeq: number;
  hscsNestedPageSlotLabel: string;

  // Suite 6: Pairwise Synergy #3 — HS + PPR (/rigorous/hs-ppr)
  hspprL1ShellSeq: number;
  hspprL1ShellLabel: string;
  hspprL1HoleSeq: number;
  hspprSidebarShellSeq: number;
  hspprSidebarHoleSeq: number;
  hspprPageAShellSeq: number;
  hspprPageAShellLabel: string;
  hspprPageAStaticSuspSeq: number;
  hspprPageAHole1Seq: number;
  hspprPageAOuterHoleSeq: number;
  hspprPageAInnerHoleSeq: number;
  hspprPageBShellSeq: number;
  hspprPageBShellLabel: string;
  hspprPageBHoleSeq: number;
  hspprStaticOptOutSeq: number;
  hspprStaticOptOutLabel: string;
  hspprL2ShellSeq: number;
  hspprL2HoleSeq: number;
  hspprNestedPageShellSeq: number;
  hspprNestedPageHoleSeq: number;
  hspprTtlLayoutShellSeq: number;
  hspprTtlLayoutHoleSeq: number;
  hspprTtlChildShellSeq: number;
  hspprTtlChildHoleSeq: number;
  hspprPageTtlShellSeq: number;
  hspprPageTtlHoleSeq: number;

  // Suite 7: Triple Synergy — HS + Cache-Slot + PPR (/rigorous/triple)
  tsL1ShellSeq: number;
  tsL1ShellLabel: string;
  tsLayoutShellSlotSeq: number;
  tsLayoutShellSlotLabel: string;
  tsL1HoleSeq: number;
  tsPprAShellSeq: number;
  tsPprAShellLabel: string;
  tsPprAShellSlotSeq: number;
  tsPprAShellSlotLabel: string;
  tsPprATtlShellSlotSeq: number;
  tsPprAHoleHostSeq: number;
  tsPprAHoleSlotSeq: number;
  tsPprAHoleSlotLabel: string;
  tsHoleNestedOuterSeq: number;
  tsHoleNestedOuterLabel: string;
  tsHoleNestedInnerSeq: number;
  tsHoleNestedInnerLabel: string;
  tsPprATtlHoleSlotSeq: number;
  tsPprBShellSeq: number;
  tsPprBShellLabel: string;
  tsPprBShellSlotSeq: number;
  tsPprBShellSlotLabel: string;
  tsPprBHoleHostSeq: number;
  tsPprBHoleSlotSeq: number;
  tsPprBHoleSlotLabel: string;
  tsStaticAHostSeq: number;
  tsStaticAHostLabel: string;
  tsStaticASlotSeq: number;
  tsStaticASlotLabel: string;
  tsStaticBHostSeq: number;
  tsStaticBSlotSeq: number;
  tsL2ShellSeq: number;
  tsNestedLayoutSlotSeq: number;
  tsNestedLayoutSlotLabel: string;
  tsL2HoleSeq: number;
  tsNestedPprShellSeq: number;
  tsNestedPprShellSlotSeq: number;
  tsNestedPprHoleHostSeq: number;
  tsNestedPprHoleSlotSeq: number;
  tsNestedStaticHostSeq: number;
  tsNestedStaticSlotSeq: number;

  serverActionPingCount: number;
  [key: string]: any;
};

const STATE_SYM = Symbol.for("bench.rigorous.state.v1");

export function createDefaultRigorousState(): RigorousState {
  return {
    hsL1LayoutSeq: 100,
    hsL1PropsSeq: 100,
    hsIndexPageSeq: 100,
    hsIndexPropsSeq: 100,
    hsSiblingASeq: 100,
    hsSiblingBSeq: 100,
    hsL2Seq: 100,
    hsBadgeSlotSeq: 100,
    hsNestedPage1Seq: 100,
    hsNestedPage2Seq: 100,
    hsDeptSeq: 100,
    hsTtlLayoutSeq: 100,
    hsTtlChildPageSeq: 100,
    hsTtlPageOnlySeq: 100,
    hsResetLayoutSeq: 100,
    hsResetPageSeq: 100,
    hsNoLayoutSeq: 100,
    hsRefreshLabLayoutSeq: 100,
    hsRefreshLabPageSeq: 100,
    hsTriggerBrokenPage: false,

    csLayoutHostSeq: 100,
    csBannerSeq: 100,
    csBannerLabel: "v100",
    csDynamicHostSeq: 100,
    csAlphaSeq: 100,
    csAlphaLabel: "v100",
    csBetaSeq: 100,
    csBetaLabel: "v100",
    csGammaSeq: 100,
    csGammaLabel: "v100",
    csNoCacheSeq: 100,
    csTagOnlySeq: 100,
    csNestedOuterSeq: 100,
    csNestedInnerSeq: 100,
    csFastSeq: 100,
    csStampedeExecCount: 0,
    csStampedeDelayMs: 0,
    csStaticHostSeq: 100,
    csStaticSlotSeq: 100,
    csStaticFastSeq: 100,

    pprShellSeq: 100,
    pprShellLabel: "v100",
    pprStaticSuspenseSeq: 100,
    pprHoleCookieSeq: 100,
    pprHoleQuerySeq: 100,
    pprHoleClientSeq: 100,
    pprOuterStaticSeq: 100,
    pprInnerDynamicSeq: 100,
    pprOuterDynamicSeq: 100,
    pprDeepInnerSeq: 100,
    pprMemoHoleSeq: 100,
    pprInheritedLayoutSeq: 100,
    pprInheritedShellSeq: 100,
    pprInheritedHoleSeq: 100,
    pprOptOutSeq: 100,
    pprTtlShellSeq: 100,
    pprTtlHoleSeq: 100,

    synShellSeq: 100,
    synShellLabel: "v100",
    synShellSlotSeq: 100,
    synShellSlotLabel: "v100",
    synShellTtlSlotSeq: 100,
    synStaticSuspSeq: 100,
    synStaticSuspSlotSeq: 100,
    synStaticSuspSlotLabel: "v100",
    synHole1HostSeq: 100,
    synHoleSlotASeq: 100,
    synHoleSlotALabel: "v100",
    synHoleSlotNoCacheSeq: 100,
    synHoleTtlSlotSeq: 100,
    synHole2HostSeq: 100,
    synNestedOuterSeq: 100,
    synNestedOuterLabel: "v100",
    synNestedInnerSeq: 100,
    synNestedInnerLabel: "v100",
    synHole3HostSeq: 100,
    synClientSlotSeq: 100,
    synClientSlotLabel: "v100",

    hscsL1HostSeq: 100,
    hscsL1SlotSeq: 100,
    hscsL1SlotLabel: "v100",
    hscsL1SharedSeq: 100,
    hscsL1OuterSeq: 100,
    hscsL1InnerSeq: 100,
    hscsL1TtlSeq: 100,
    hscsSidebarHostSeq: 100,
    hscsSidebarSlotSeq: 100,
    hscsSidebarSlotLabel: "v100",
    hscsPageAHostSeq: 100,
    hscsPageASlotSeq: 100,
    hscsPageASlotLabel: "v100",
    hscsPageASlotDelayMs: 0,
    hscsPageASharedSeq: 100,
    hscsPageAOuterSeq: 100,
    hscsPageAInnerSeq: 100,
    hscsPageADynSeq: 100,
    hscsPageATtlSeq: 100,
    hscsPageBHostSeq: 100,
    hscsPageBSlotSeq: 100,
    hscsPageBSlotLabel: "v100",
    hscsL2HostSeq: 100,
    hscsL2SlotSeq: 100,
    hscsL2SlotLabel: "v100",
    hscsNestedPageHostSeq: 100,
    hscsNestedPageSlotSeq: 100,
    hscsNestedPageSlotLabel: "v100",

    hspprL1ShellSeq: 100,
    hspprL1ShellLabel: "v100",
    hspprL1HoleSeq: 100,
    hspprSidebarShellSeq: 100,
    hspprSidebarHoleSeq: 100,
    hspprPageAShellSeq: 100,
    hspprPageAShellLabel: "v100",
    hspprPageAStaticSuspSeq: 100,
    hspprPageAHole1Seq: 100,
    hspprPageAOuterHoleSeq: 100,
    hspprPageAInnerHoleSeq: 100,
    hspprPageBShellSeq: 100,
    hspprPageBShellLabel: "v100",
    hspprPageBHoleSeq: 100,
    hspprStaticOptOutSeq: 100,
    hspprStaticOptOutLabel: "v100",
    hspprL2ShellSeq: 100,
    hspprL2HoleSeq: 100,
    hspprNestedPageShellSeq: 100,
    hspprNestedPageHoleSeq: 100,
    hspprTtlLayoutShellSeq: 100,
    hspprTtlLayoutHoleSeq: 100,
    hspprTtlChildShellSeq: 100,
    hspprTtlChildHoleSeq: 100,
    hspprPageTtlShellSeq: 100,
    hspprPageTtlHoleSeq: 100,

    tsL1ShellSeq: 100,
    tsL1ShellLabel: "v100",
    tsLayoutShellSlotSeq: 100,
    tsLayoutShellSlotLabel: "v100",
    tsL1HoleSeq: 100,
    tsPprAShellSeq: 100,
    tsPprAShellLabel: "v100",
    tsPprAShellSlotSeq: 100,
    tsPprAShellSlotLabel: "v100",
    tsPprATtlShellSlotSeq: 100,
    tsPprAHoleHostSeq: 100,
    tsPprAHoleSlotSeq: 100,
    tsPprAHoleSlotLabel: "v100",
    tsHoleNestedOuterSeq: 100,
    tsHoleNestedOuterLabel: "v100",
    tsHoleNestedInnerSeq: 100,
    tsHoleNestedInnerLabel: "v100",
    tsPprATtlHoleSlotSeq: 100,
    tsPprBShellSeq: 100,
    tsPprBShellLabel: "v100",
    tsPprBShellSlotSeq: 100,
    tsPprBShellSlotLabel: "v100",
    tsPprBHoleHostSeq: 100,
    tsPprBHoleSlotSeq: 100,
    tsPprBHoleSlotLabel: "v100",
    tsStaticAHostSeq: 100,
    tsStaticAHostLabel: "v100",
    tsStaticASlotSeq: 100,
    tsStaticASlotLabel: "v100",
    tsStaticBHostSeq: 100,
    tsStaticBSlotSeq: 100,
    tsL2ShellSeq: 100,
    tsNestedLayoutSlotSeq: 100,
    tsNestedLayoutSlotLabel: "v100",
    tsL2HoleSeq: 100,
    tsNestedPprShellSeq: 100,
    tsNestedPprShellSlotSeq: 100,
    tsNestedPprHoleHostSeq: 100,
    tsNestedPprHoleSlotSeq: 100,
    tsNestedStaticHostSeq: 100,
    tsNestedStaticSlotSeq: 100,

    serverActionPingCount: 100,
  };
}

export function getRigorousState(): RigorousState {
  const g = globalThis as unknown as Record<symbol, RigorousState>;
  if (!g[STATE_SYM]) {
    g[STATE_SYM] = createDefaultRigorousState();
  }
  return g[STATE_SYM];
}

export function mutateRigorousState(patch: Partial<RigorousState>): RigorousState {
  const state = getRigorousState();
  Object.assign(state, patch);
  return state;
}

export function bumpRigorousKeys(keys: (keyof RigorousState)[], delta = 1): RigorousState {
  const state = getRigorousState();
  for (const k of keys) {
    state[k] = (Number(state[k]) || 100) + delta;
  }
  return state;
}

export function resetRigorousState(): RigorousState {
  const g = globalThis as unknown as Record<symbol, RigorousState>;
  g[STATE_SYM] = createDefaultRigorousState();
  return g[STATE_SYM];
}
