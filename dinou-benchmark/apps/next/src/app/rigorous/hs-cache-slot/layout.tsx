import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";
import { rigorousSlotServerPing } from "../rigorous-actions";
import {
  getHscsL1InnerSlotState,
  getHscsL1LayoutState,
  getHscsL1OuterSlotState,
  getHscsL1SharedSlotState,
  getHscsL1SlotState,
} from "../next-cached-segments";

async function HscsL1SlotContent() {
  const s = await getHscsL1SlotState();
  return (
    <div id="hscs-l1-slot-box">
      <span>
        L1 Slot Seq: <strong id="hscs-l1-slot-seq">{s.hscsL1SlotSeq}</strong> | Label:{" "}
        <span id="hscs-l1-slot-label">{s.hscsL1SlotLabel}</span>
      </span>
      <RigorousSlotWidget
        id="hscs-l1-slot-widget"
        serverToken={`l1-slot-${s.hscsL1SlotSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

async function HscsL1SharedSlotContent() {
  const s = await getHscsL1SharedSlotState();
  return (
    <span id="hscs-l1-shared-box">
      L1 Shared Seq: <strong id="hscs-l1-shared-seq">{s.hscsL1SharedSeq}</strong>
    </span>
  );
}

async function HscsL1InnerSlotContent() {
  const s = await getHscsL1InnerSlotState();
  return (
    <span id="hscs-l1-inner-box" style={{ marginLeft: 8 }}>
      L1 Inner Seq: <strong id="hscs-l1-inner-seq">{s.hscsL1InnerSeq}</strong>
    </span>
  );
}

async function HscsL1OuterSlotContent({ children }: { children: ReactNode }) {
  const s = await getHscsL1OuterSlotState();
  return (
    <div id="hscs-l1-outer-box" style={{ border: "1px dotted #00695c", padding: 4 }}>
      <span>
        L1 Outer Seq: <strong id="hscs-l1-outer-seq">{s.hscsL1OuterSeq}</strong>
      </span>
      {children}
    </div>
  );
}

async function HscsL1TtlSlotContent() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("hscs-tag-l1-ttl", "slot:hscs-l1-ttl-slot", "slot:*");
  const s = getRigorousState();
  return (
    <span id="hscs-l1-ttl-box">
      L1 TTL (1s) Seq: <strong id="hscs-l1-ttl-seq">{s.hscsL1TtlSeq}</strong>
    </span>
  );
}

export default async function HsCacheSlotLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  const s = await getHscsL1LayoutState();
  return (
    <div id="hscs-l1-layout" style={{ border: "2px solid #2e7d32", padding: 12 }}>
      <RigorousControls suite="hs-cache-slot" />
      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <strong>HS+CS L1 Host Seq:</strong>{" "}
          <span id="hscs-l1-host-seq">{s.hscsL1HostSeq}</span>
          <RigorousClientProbe id="hscs-l1-client" label="HS+CS L1 Client" />
        </div>
        <HscsL1SlotContent />
        <HscsL1SharedSlotContent />
        <HscsL1OuterSlotContent>
          <HscsL1InnerSlotContent />
        </HscsL1OuterSlotContent>
        <Suspense fallback={null}>
          <HscsL1TtlSlotContent />
        </Suspense>
        <div id="hscs-sidebar-container">{sidebar}</div>
      </div>

      <nav style={{ display: "flex", gap: 10, margin: "8px 0" }}>
        <Link id="nav-hscs-page-a" href="/rigorous/hs-cache-slot">
          Page A
        </Link>
        <Link id="nav-hscs-page-b" href="/rigorous/hs-cache-slot/page-b">
          Page B
        </Link>
        <Link id="nav-hscs-nested" href="/rigorous/hs-cache-slot/nested">
          Nested L2
        </Link>
      </nav>

      <div id="hscs-l1-outlet">{children}</div>
    </div>
  );
}
