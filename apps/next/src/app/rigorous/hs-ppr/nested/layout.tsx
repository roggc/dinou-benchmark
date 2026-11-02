import type { ReactNode } from "react";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { sleep } from "@/shared/lib/data";

async function HsPprL2Hole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="hsppr-l2-hole">
      L2 Hole Seq: <span id="hsppr-l2-hole-seq">{s.hspprL2HoleSeq}</span>
    </div>
  );
}

async function getHsPprL2ShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hsppr-l2-layout-tag",
    "layout:/rigorous/hs-ppr/nested",
    "subtree:/rigorous/hs-ppr/nested",
    "subtree:/rigorous/hs-ppr"
  );
  return getRigorousState();
}

export default async function HsPprNestedLayout({ children }: { children: ReactNode }) {
  const s = await getHsPprL2ShellState();
  return (
    <div id="hsppr-l2-layout" style={{ border: "1px dashed #ad1457", padding: 8, marginTop: 8 }}>
      <div>
        L2 PPR Shell Seq: <span id="hsppr-l2-shell-seq">{s.hspprL2ShellSeq}</span>
        <RigorousClientProbe id="hsppr-l2-client" label="HS+PPR L2 Client" />
      </div>
      <Suspense fallback={<div id="hsppr-fallback-l2-hole">Loading L2 hole...</div>}>
        <HsPprL2Hole />
      </Suspense>
      <div id="hsppr-l2-outlet">{children}</div>
    </div>
  );
}

