import { Suspense } from "react";
import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { sleep } from "../../../shared/lib/data";

async function HsPprTtlChildHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="hsppr-ttl-child-hole">
      TTL Child Hole Seq: <span id="hsppr-ttl-child-hole-seq">{s.hspprTtlChildHoleSeq}</span>
    </div>
  );
}

export default function HsPprTtlChildPage() {
  const s = getRigorousState();
  return (
    <div id="hsppr-ttl-child-page">
      <h2>TTL Layout Child PPR Page (3600s)</h2>
      <p>
        Child Shell Seq: <span id="hsppr-ttl-child-shell-seq">{s.hspprTtlChildShellSeq}</span>
      </p>
      <Suspense fallback={<div id="hsppr-fallback-ttl-child">Loading ttl child hole...</div>}>
        <HsPprTtlChildHole />
      </Suspense>
    </div>
  );
}
