import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "../../shared/components/rigorous-ui";
import { rigorousSlotServerPing } from "../rigorous-actions";

function CsAlphaSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-alpha-slot" style={{ border: "1px solid #00897b", padding: 8 }}>
      <p>
        Alpha Seq: <span id="cs-alpha-seq">{s.csAlphaSeq}</span> | Label:{" "}
        <span id="cs-alpha-label">{s.csAlphaLabel}</span>
      </p>
      <RigorousSlotWidget
        id="cs-alpha-widget"
        serverToken={`alpha-${s.csAlphaSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

function CsBetaSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-beta-slot">
      Beta Seq: <span id="cs-beta-seq">{s.csBetaSeq}</span> | Label:{" "}
      <span id="cs-beta-label">{s.csBetaLabel}</span>
    </div>
  );
}

function CsGammaSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-gamma-slot">
      Gamma Seq: <span id="cs-gamma-seq">{s.csGammaSeq}</span> | Label:{" "}
      <span id="cs-gamma-label">{s.csGammaLabel}</span>
    </div>
  );
}

function CsNoCacheSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-nocache-slot">
      NoCache (revalidate=0) Seq: <span id="cs-nocache-seq">{s.csNoCacheSeq}</span>
    </div>
  );
}

function CsTagOnlySlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-tagonly-slot">
      TagOnly Seq: <span id="cs-tagonly-seq">{s.csTagOnlySeq}</span>
    </div>
  );
}

function CsNestedInnerSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-nested-inner-slot" style={{ border: "1px dotted #5e35b1", padding: 6, marginTop: 4 }}>
      Nested Inner Seq: <span id="cs-nested-inner-seq">{s.csNestedInnerSeq}</span>
    </div>
  );
}

function CsNestedOuterSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-nested-outer-slot" style={{ border: "1px dashed #3949ab", padding: 8 }}>
      <div>
        Nested Outer Seq: <span id="cs-nested-outer-seq">{s.csNestedOuterSeq}</span>
      </div>
      <DinouCacheSlot id="cs-slot-nested-inner" tags={["cs-tag-nested-inner"]} revalidate={3600}>
        <CsNestedInnerSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

function CsFastTtlSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-fast-slot">
      Fast TTL (1s) Seq: <span id="cs-fast-seq">{s.csFastSeq}</span>
    </div>
  );
}

export default function CacheSlotDynamicPage() {
  const s = getRigorousState();
  return (
    <div id="cs-dynamic-page">
      <h2>Cache-Slot Dynamic Host (revalidate=0)</h2>
      <p>
        Dynamic Host Seq: <span id="cs-dynamic-host-seq">{s.csDynamicHostSeq}</span>
      </p>
      <RigorousClientProbe id="cs-page-client" label="CS Page Client" />

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <DinouCacheSlot id="cs-slot-alpha" tags={["cs-tag-alpha"]} revalidate={3600}>
          <CsAlphaSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="cs-slot-beta" tags={["cs-tag-beta", "cs-tag-shared"]} revalidate={3600}>
          <CsBetaSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="cs-slot-gamma" tags={["cs-tag-gamma", "cs-tag-shared"]} revalidate={3600}>
          <CsGammaSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="cs-slot-nocache" revalidate={0}>
          <CsNoCacheSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot tags={["cs-tag-only"]} revalidate={3600}>
          <CsTagOnlySlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="cs-slot-nested-outer" tags={["cs-tag-nested-outer"]} revalidate={3600}>
          <CsNestedOuterSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="cs-slot-fast" tags={["cs-tag-fast"]} revalidate={1}>
          <CsFastTtlSlotContent />
        </DinouCacheSlot>
      </div>
    </div>
  );
}
