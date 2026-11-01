import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousControls } from "../../rigorous-controls";

async function getHsNoLayoutState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("page:/rigorous/hs/no-layout-page");
  return getRigorousState();
}

export default async function HsNoLayoutPage() {
  const s = await getHsNoLayoutState();
  return (
    <div id="hs-no-layout-page" style={{ border: "2px solid #0277bd", padding: 12 }}>
      <RigorousControls suite="hs-nolayout" />
      <h2>No Layout Standalone Page</h2>
      <p>
        No-Layout Seq: <span id="hs-no-layout-seq">{s.hsNoLayoutSeq}</span>
      </p>
      <Link id="nav-hs-nolayout-back" href="/rigorous/hs">
        Back to HS L1
      </Link>
    </div>
  );
}

