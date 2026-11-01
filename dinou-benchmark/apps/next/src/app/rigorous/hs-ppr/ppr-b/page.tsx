import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { sleep } from "@/shared/lib/data";

async function HsPprPageBHole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="hsppr-page-b-hole">
      Page B Hole Seq: <span id="hsppr-page-b-hole-seq">{s.hspprPageBHoleSeq}</span>
    </div>
  );
}

async function getHsPprPageBShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hsppr-page-b-tag", "page:/rigorous/hs-ppr/ppr-b", "subtree:/rigorous/hs-ppr/ppr-b");
  return getRigorousState();
}

export default async function HsPprPageB() {
  const s = await getHsPprPageBShellState();
  return (
    <div id="hsppr-page-b">
      <h2>HS + PPR Page B (Sibling)</h2>
      <p>
        Page B Shell Seq: <span id="hsppr-page-b-shell-seq">{s.hspprPageBShellSeq}</span> | Label:{" "}
        <span id="hsppr-page-b-shell-label">{s.hspprPageBShellLabel}</span>
      </p>
      <RigorousClientProbe id="hsppr-page-b-client" label="HS+PPR Page B Client" />
      <Suspense fallback={<div id="hsppr-fallback-page-b-hole">Loading page B hole...</div>}>
        <HsPprPageBHole />
      </Suspense>
    </div>
  );
}

