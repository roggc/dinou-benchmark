import type { ReactNode } from "react";
import { Link } from "dinou";
import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "../../shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";
import { rigorousSlotServerPing } from "../rigorous-actions";

function HscsL1SlotContent() {
  const s = getRigorousState();
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

function HscsL1SharedSlotContent() {
  const s = getRigorousState();
  return (
    <span id="hscs-l1-shared-box">
      L1 Shared Seq: <strong id="hscs-l1-shared-seq">{s.hscsL1SharedSeq}</strong>
    </span>
  );
}

function HscsL1InnerSlotContent() {
  const s = getRigorousState();
  return (
    <span id="hscs-l1-inner-box" style={{ marginLeft: 8 }}>
      L1 Inner Seq: <strong id="hscs-l1-inner-seq">{s.hscsL1InnerSeq}</strong>
    </span>
  );
}

function HscsL1OuterSlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-l1-outer-box" style={{ border: "1px dotted #00695c", padding: 4 }}>
      <span>
        L1 Outer Seq: <strong id="hscs-l1-outer-seq">{s.hscsL1OuterSeq}</strong>
      </span>
      <DinouCacheSlot id="hscs-l1-inner-slot" tags={["hscs-tag-l1-inner"]} revalidate={3600}>
        <HscsL1InnerSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

function HscsL1TtlSlotContent() {
  const s = getRigorousState();
  return (
    <span id="hscs-l1-ttl-box">
      L1 TTL (1s) Seq: <strong id="hscs-l1-ttl-seq">{s.hscsL1TtlSeq}</strong>
    </span>
  );
}

export default function HsCacheSlotLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  const s = getRigorousState();
  return (
    <div id="hscs-l1-layout" style={{ border: "2px solid #2e7d32", padding: 12 }}>
      <RigorousControls suite="hs-cache-slot" />
      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <strong>HS+CS L1 Host Seq:</strong>{" "}
          <span id="hscs-l1-host-seq">{s.hscsL1HostSeq}</span>
          <RigorousClientProbe id="hscs-l1-client" label="HS+CS L1 Client" />
        </div>
        <DinouCacheSlot id="hscs-l1-slot" tags={["hscs-tag-l1-slot"]} revalidate={3600}>
          <HscsL1SlotContent />
        </DinouCacheSlot>
        <DinouCacheSlot id="hscs-l1-shared-slot" tags={["hscs-tag-shared"]} revalidate={3600}>
          <HscsL1SharedSlotContent />
        </DinouCacheSlot>
        <DinouCacheSlot id="hscs-l1-outer-slot" tags={["hscs-tag-l1-outer"]} revalidate={3600}>
          <HscsL1OuterSlotContent />
        </DinouCacheSlot>
        <DinouCacheSlot id="hscs-l1-ttl-slot" tags={["hscs-tag-l1-ttl"]} revalidate={1}>
          <HscsL1TtlSlotContent />
        </DinouCacheSlot>
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
