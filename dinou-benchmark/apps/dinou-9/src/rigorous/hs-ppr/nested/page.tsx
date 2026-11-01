import { Suspense } from "react";
import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { sleep } from "../../../shared/lib/data";

async function HsPprNestedPageHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="hsppr-nested-page-hole">
      Nested Page Hole Seq: <span id="hsppr-nested-page-hole-seq">{s.hspprNestedPageHoleSeq}</span>
    </div>
  );
}

export default function HsPprNestedPage() {
  const s = getRigorousState();
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
