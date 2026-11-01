import { Suspense, type ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { rigorousSlotServerPing } from "../rigorous-actions";
import { sleep } from "@/shared/lib/data";

async function TsPprAShellSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-ppr-a-shell-slot", "slot:ts-ppr-a-shell-slot", "slot:*");
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

async function TsPprATtlShellSlotContent() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("ts-tag-ppr-a-ttl-shell", "slot:ts-ppr-a-ttl-shell-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-ttl-shell-slot-box">
      PPR A Shell TTL (1s) Slot Seq:{" "}
      <span id="ts-ppr-a-ttl-shell-slot-seq">{s.tsPprATtlShellSlotSeq}</span>
    </div>
  );
}

async function TsPprAHoleSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-ppr-a-hole-slot", "slot:ts-ppr-a-hole-slot", "slot:*");
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

async function TsHoleNestedInnerContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-hole-nested-inner", "slot:ts-hole-nested-inner", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-hole-nested-inner-box" style={{ border: "1px dotted #4a148c", padding: 4, marginTop: 4 }}>
      Hole Nested Inner Seq:{" "}
      <span id="ts-hole-nested-inner-seq">{s.tsHoleNestedInnerSeq}</span> | Label:{" "}
      <span id="ts-hole-nested-inner-label">{s.tsHoleNestedInnerLabel}</span>
    </div>
  );
}

async function TsHoleNestedOuterContent({ children }: { children: ReactNode }) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-hole-nested-outer", "slot:ts-hole-nested-outer", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-hole-nested-outer-box" style={{ border: "1px dashed #4a148c", padding: 6 }}>
      <div>
        Hole Nested Outer Seq:{" "}
        <span id="ts-hole-nested-outer-seq">{s.tsHoleNestedOuterSeq}</span> | Label:{" "}
        <span id="ts-hole-nested-outer-label">{s.tsHoleNestedOuterLabel}</span>
      </div>
      {children}
    </div>
  );
}

async function TsPprATtlHoleSlotContent() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("ts-tag-ppr-a-ttl-hole", "slot:ts-ppr-a-ttl-hole-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-ttl-hole-slot-box">
      PPR A Hole TTL (1s) Slot Seq:{" "}
      <span id="ts-ppr-a-ttl-hole-slot-seq">{s.tsPprATtlHoleSlotSeq}</span>
    </div>
  );
}

async function TsPprADynamicHole({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const mode = typeof sp?.mode === "string" && sp.mode ? sp.mode : "standard";
  await sleep(25);
  const s = getRigorousState();
  return (
    <div id="ts-ppr-a-hole" style={{ border: "1px dashed #c62828", padding: 8 }}>
      <div>
        PPR A Hole Host Seq:{" "}
        <span id="ts-ppr-a-hole-host-seq">{s.tsPprAHoleHostSeq}</span> | Mode:{" "}
        <span id="ts-ppr-a-hole-mode">{mode}</span>
      </div>
      <TsPprAHoleSlotContent />
      <TsHoleNestedOuterContent>
        <TsHoleNestedInnerContent />
      </TsHoleNestedOuterContent>
      <TsPprATtlHoleSlotContent />
    </div>
  );
}

async function getTsPprAShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-ppr-a-tag", "page:/rigorous/triple", "subtree:/rigorous/triple");
  return getRigorousState();
}

export default async function TripleSynergyPageA({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const s = await getTsPprAShellState();
  return (
    <div id="ts-ppr-a-page">
      <h2>Triple Synergy Page A (HS + Cache-Slot + PPR)</h2>
      <p>
        PPR A Shell Seq: <span id="ts-ppr-a-shell-seq">{s.tsPprAShellSeq}</span> | Label:{" "}
        <span id="ts-ppr-a-shell-label">{s.tsPprAShellLabel}</span>
      </p>
      <RigorousClientProbe id="ts-ppr-a-client" label="Triple Page A Client" />

      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <TsPprAShellSlotContent />
        <Suspense fallback={null}>
          <TsPprATtlShellSlotContent />
        </Suspense>

        <Suspense fallback={<div id="ts-fallback-ppr-a-hole">Loading triple page A hole...</div>}>
          <TsPprADynamicHole searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

