import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

async function HsPprNestedPageHole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="hsppr-nested-page-hole">
      Nested Page Hole Seq: <span id="hsppr-nested-page-hole-seq">{s.hspprNestedPageHoleSeq}</span>
    </div>
  );
}

async function getHsPprNestedPageShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hsppr-nested-page-tag",
    "page:/rigorous/hs-ppr/nested",
    "subtree:/rigorous/hs-ppr/nested"
  );
  return getRigorousState();
}

export default async function HsPprNestedPage() {
  const s = await getHsPprNestedPageShellState();
  return (
    <div id="hsppr-nested-page">
      <h2>HS + PPR Nested Page</h2>
      <p>
        Nested Page Shell Seq:{" "}
        <span id="hsppr-nested-page-shell-seq">{s.hspprNestedPageShellSeq}</span>
      </p>
      <Suspense fallback={<div id="hsppr-fallback-nested-page-hole">Loading nested hole...</div>}>
        <HsPprNestedPageHole />
      </Suspense>
    </div>
  );
}

