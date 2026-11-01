import { Suspense } from "react";
import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousClientProbe } from "../../../shared/components/rigorous-ui";
import { sleep } from "../../../shared/lib/data";

async function HsPprPageBHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="hsppr-page-b-hole">
      Page B Hole Seq: <span id="hsppr-page-b-hole-seq">{s.hspprPageBHoleSeq}</span>
    </div>
  );
}

export default function HsPprPageB() {
  const s = getRigorousState();
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
