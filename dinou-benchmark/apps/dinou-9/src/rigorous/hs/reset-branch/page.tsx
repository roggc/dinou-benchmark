import { getRigorousState } from "../../../shared/lib/rigorous-state";

export default function HsResetBranchPage() {
  const s = getRigorousState();
  return (
    <div id="hs-reset-page">
      <h2>Reset Branch Page</h2>
      <p>
        Reset Page Seq: <span id="hs-reset-page-seq">{s.hsResetPageSeq}</span>
      </p>
    </div>
  );
}
