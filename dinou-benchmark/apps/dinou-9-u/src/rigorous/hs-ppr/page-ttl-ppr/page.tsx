import { Suspense } from "react";
import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { sleep } from "../../../shared/lib/data";

async function HsPprPageTtlHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="hsppr-page-ttl-hole">
      Page TTL Hole Seq: <span id="hsppr-page-ttl-hole-seq">{s.hspprPageTtlHoleSeq}</span>
    </div>
  );
}

export default function HsPprPageTtlOnly() {
  const s = getRigorousState();
  return (
    <div id="hsppr-page-ttl-only">
      <h2>PPR Page TTL Only (1s)</h2>
      <p>
        Page TTL Shell Seq: <span id="hsppr-page-ttl-shell-seq">{s.hspprPageTtlShellSeq}</span>
      </p>
      <Suspense fallback={<div id="hsppr-fallback-page-ttl">Loading page ttl hole...</div>}>
        <HsPprPageTtlHole />
      </Suspense>
    </div>
  );
}
