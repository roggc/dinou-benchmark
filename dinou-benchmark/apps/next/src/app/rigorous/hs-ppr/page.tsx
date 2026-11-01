import { Suspense } from "react";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { sleep } from "@/shared/lib/data";
import {
  getHsPprPageAShellState,
  getHsPprPageAStaticSuspenseState,
} from "../next-cached-segments";

async function HsPprPageAStaticSuspense() {
  const s = await getHsPprPageAStaticSuspenseState();
  return (
    <div id="hsppr-page-a-static-susp">
      Page A Static Collapsed Suspense Seq:{" "}
      <span id="hsppr-page-a-static-susp-seq">{s.hspprPageAStaticSuspSeq}</span>
    </div>
  );
}

async function HsPprPageAHole1({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const filter = typeof sp?.filter === "string" && sp.filter ? sp.filter : "all";
  await sleep(25);
  const s = getRigorousState();
  return (
    <div id="hsppr-page-a-hole1" style={{ border: "1px solid #6a1b9a", padding: 6 }}>
      <div>
        Page A Hole 1 Seq: <span id="hsppr-page-a-hole1-seq">{s.hspprPageAHole1Seq}</span> | Filter:{" "}
        <span id="hsppr-page-a-hole1-filter">{filter}</span>
      </div>
      <RigorousSlotWidget
        id="hsppr-page-a-hole1-widget"
        serverToken={`hsppr-a-${s.hspprPageAHole1Seq}`}
      />
    </div>
  );
}

async function HsPprPageAInnerHole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="hsppr-page-a-inner-hole" style={{ border: "1px dotted #4a148c", padding: 4, marginTop: 4 }}>
      Page A Inner Hole Seq:{" "}
      <span id="hsppr-page-a-inner-hole-seq">{s.hspprPageAInnerHoleSeq}</span>
    </div>
  );
}

async function HsPprPageAOuterHole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="hsppr-page-a-outer-hole" style={{ border: "1px dashed #4a148c", padding: 6 }}>
      <div>
        Page A Outer Hole Seq:{" "}
        <span id="hsppr-page-a-outer-hole-seq">{s.hspprPageAOuterHoleSeq}</span>
      </div>
      <Suspense fallback={<div id="hsppr-fallback-page-a-inner">Loading page A inner hole...</div>}>
        <HsPprPageAInnerHole />
      </Suspense>
    </div>
  );
}

export default async function HsPprPageA({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const s = await getHsPprPageAShellState();
  return (
    <div id="hsppr-page-a">
      <h2>HS + PPR Page A</h2>
      <p>
        Page A Shell Seq: <span id="hsppr-page-a-shell-seq">{s.hspprPageAShellSeq}</span> | Label:{" "}
        <span id="hsppr-page-a-shell-label">{s.hspprPageAShellLabel}</span>
      </p>
      <RigorousClientProbe id="hsppr-page-a-client" label="HS+PPR Page A Client" />

      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        <Suspense fallback={<div id="hsppr-fallback-page-a-static">Static suspense...</div>}>
          <HsPprPageAStaticSuspense />
        </Suspense>

        <Suspense fallback={<div id="hsppr-fallback-page-a-hole1">Loading page A hole 1...</div>}>
          <HsPprPageAHole1 searchParams={searchParams} />
        </Suspense>

        <Suspense fallback={<div id="hsppr-fallback-page-a-outer">Loading page A outer hole...</div>}>
          <HsPprPageAOuterHole />
        </Suspense>
      </div>
    </div>
  );
}

