import { Suspense } from "react";
import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { sleep } from "../../../shared/lib/data";

async function InheritedHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ppr-inherited-hole">
      Inherited Hole Seq: <span id="ppr-inherited-hole-seq">{s.pprInheritedHoleSeq}</span>
    </div>
  );
}

export default function PprInheritedPage() {
  const s = getRigorousState();
  return (
    <div id="ppr-inherited-page">
      <h2>Inherited PPR Page (No page_functions.ts)</h2>
      <p>
        Inherited Shell Seq: <span id="ppr-inherited-shell-seq">{s.pprInheritedShellSeq}</span>
      </p>
      <Suspense fallback={<div id="ppr-fallback-inherited">Loading inherited hole...</div>}>
        <InheritedHole />
      </Suspense>
    </div>
  );
}
