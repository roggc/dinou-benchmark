import { Suspense } from "react";
import { getContext } from "dinou";
import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "../../shared/components/rigorous-ui";
import { rigorousSlotServerPing } from "../rigorous-actions";
import { sleep } from "../../shared/lib/data";

function TsPprAShellSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-shell-slot-box" style={{ border: "1px solid #c62828", padding: 6 }}>
      <div>
        PPR A Shell Slot Seq:{" "}
        <span id="ts-ppr-a-shell-slot-seq">{s.tsPprAShellSlotSeq}</span> | Label:{" "}
        <span id="ts-ppr-a-shell-slot-label">{s.tsPprAShellSlotLabel}</span>
      </div>
      <RigorousSlotWidget
        id="ts-ppr-a-shell-widget"
        serverToken={`ts-a-shell-${s.tsPprAShellSlotSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

function TsPprATtlShellSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-ttl-shell-slot-box">
      PPR A Shell TTL (1s) Slot Seq:{" "}
      <span id="ts-ppr-a-ttl-shell-slot-seq">{s.tsPprATtlShellSlotSeq}</span>
    </div>
  );
}

function TsPprAHoleSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-hole-slot-box" style={{ border: "1px solid #0277bd", padding: 6 }}>
      <div>
        PPR A Hole Slot Seq:{" "}
        <span id="ts-ppr-a-hole-slot-seq">{s.tsPprAHoleSlotSeq}</span> | Label:{" "}
        <span id="ts-ppr-a-hole-slot-label">{s.tsPprAHoleSlotLabel}</span>
      </div>
      <RigorousSlotWidget
        id="ts-ppr-a-hole-widget"
        serverToken={`ts-a-hole-${s.tsPprAHoleSlotSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

function TsHoleNestedInnerContent() {
  const s = getRigorousState();
  return (
    <div id="ts-hole-nested-inner-box" style={{ border: "1px dotted #4a148c", padding: 4, marginTop: 4 }}>
      Hole Nested Inner Seq:{" "}
      <span id="ts-hole-nested-inner-seq">{s.tsHoleNestedInnerSeq}</span> | Label:{" "}
      <span id="ts-hole-nested-inner-label">{s.tsHoleNestedInnerLabel}</span>
    </div>
  );
}

function TsHoleNestedOuterContent() {
  const s = getRigorousState();
  return (
    <div id="ts-hole-nested-outer-box" style={{ border: "1px dashed #4a148c", padding: 6 }}>
      <div>
        Hole Nested Outer Seq:{" "}
        <span id="ts-hole-nested-outer-seq">{s.tsHoleNestedOuterSeq}</span> | Label:{" "}
        <span id="ts-hole-nested-outer-label">{s.tsHoleNestedOuterLabel}</span>
      </div>
      <DinouCacheSlot
        id="ts-hole-nested-inner"
        tags={["ts-tag-hole-nested-inner"]}
        revalidate={3600}
      >
        <TsHoleNestedInnerContent />
      </DinouCacheSlot>
    </div>
  );
}

function TsPprATtlHoleSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-ttl-hole-slot-box">
      PPR A Hole TTL (1s) Slot Seq:{" "}
      <span id="ts-ppr-a-ttl-hole-slot-seq">{s.tsPprATtlHoleSlotSeq}</span>
    </div>
  );
}

async function TsPprADynamicHole() {
  const ctx = getContext();
  const rawMode = ctx?.req?.query?.mode;
  const mode = typeof rawMode === "string" && rawMode ? rawMode : "standard";
  await sleep(25);
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-hole" style={{ border: "1px dashed #c62828", padding: 8 }}>
      <div>
        PPR A Hole Host Seq:{" "}
        <span id="ts-ppr-a-hole-host-seq">{s.tsPprAHoleHostSeq}</span> | Mode:{" "}
        <span id="ts-ppr-a-hole-mode">{mode}</span>
      </div>
      <DinouCacheSlot
        id="ts-ppr-a-hole-slot"
        tags={["ts-tag-ppr-a-hole-slot"]}
        revalidate={3600}
      >
        <TsPprAHoleSlotContent />
      </DinouCacheSlot>
      <DinouCacheSlot
        id="ts-hole-nested-outer"
        tags={["ts-tag-hole-nested-outer"]}
        revalidate={3600}
      >
        <TsHoleNestedOuterContent />
      </DinouCacheSlot>
      <DinouCacheSlot
        id="ts-ppr-a-ttl-hole-slot"
        tags={["ts-tag-ppr-a-ttl-hole"]}
        revalidate={1}
      >
        <TsPprATtlHoleSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

export default function TripleSynergyPageA() {
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-page">
      <h2>Triple Synergy Page A (HS + Cache-Slot + PPR)</h2>
      <p>
        PPR A Shell Seq: <span id="ts-ppr-a-shell-seq">{s.tsPprAShellSeq}</span> | Label:{" "}
        <span id="ts-ppr-a-shell-label">{s.tsPprAShellLabel}</span>
      </p>
      <RigorousClientProbe id="ts-ppr-a-client" label="Triple Page A Client" />

      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <DinouCacheSlot
          id="ts-ppr-a-shell-slot"
          tags={["ts-tag-ppr-a-shell-slot"]}
          revalidate={3600}
        >
          <TsPprAShellSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot
          id="ts-ppr-a-ttl-shell-slot"
          tags={["ts-tag-ppr-a-ttl-shell"]}
          revalidate={1}
        >
          <TsPprATtlShellSlotContent />
        </DinouCacheSlot>

        <Suspense fallback={<div id="ts-fallback-ppr-a-hole">Loading triple page A hole...</div>}>
          <TsPprADynamicHole />
        </Suspense>
      </div>
    </div>
  );
}
