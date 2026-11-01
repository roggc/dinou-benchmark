import { getContext } from "dinou";
import { getRigorousState } from "../../../shared/lib/rigorous-state";

export default function HsRefreshLabPage() {
  const s = getRigorousState();
  const ctx = getContext();
  const q = ctx?.req?.query ?? {};
  const filter = typeof q.filter === "string" && q.filter ? q.filter : "none";
  const buildId = typeof q.buildId === "string" && q.buildId ? q.buildId : "none";
  const v = typeof q.v === "string" && q.v ? q.v : "none";

  return (
    <div id="hs-refresh-lab-page">
      <h2>HS Refresh Lab (Query & Refresh Scope)</h2>
      <p>
        Refresh Lab Page Seq: <span id="hs-refresh-page-seq">{s.hsRefreshLabPageSeq}</span>
      </p>
      <p>
        Query Filter: <span id="hs-refresh-query-filter">{filter}</span> | buildId:{" "}
        <span id="hs-refresh-query-buildid">{buildId}</span> | v:{" "}
        <span id="hs-refresh-query-v">{v}</span>
      </p>
    </div>
  );
}

