import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function getHsResetPageState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("page:/rigorous/hs/reset-branch");
  return getRigorousState();
}

export default async function HsResetBranchPage() {
  const s = await getHsResetPageState();
  return (
    <div id="hs-reset-page">
      <h2>Reset Branch Page</h2>
      <p>
        Reset Page Seq: <span id="hs-reset-page-seq">{s.hsResetPageSeq}</span>
      </p>
    </div>
  );
}

