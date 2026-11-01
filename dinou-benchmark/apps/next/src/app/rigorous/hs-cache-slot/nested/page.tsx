import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function HscsNestedPageSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("hscs-tag-nested-page-slot", "slot:hscs-nested-page-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="hscs-nested-page-slot-box">
      Nested Page Slot Seq:{" "}
      <span id="hscs-nested-page-slot-seq">{s.hscsNestedPageSlotSeq}</span> | Label:{" "}
      <span id="hscs-nested-page-slot-label">{s.hscsNestedPageSlotLabel}</span>
    </div>
  );
}

async function getHscsNestedPageHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "hscs-nested-page-tag",
    "page:/rigorous/hs-cache-slot/nested",
    "subtree:/rigorous/hs-cache-slot/nested"
  );
  return getRigorousState();
}

export default async function HsCacheSlotNestedPage() {
  const s = await getHscsNestedPageHostState();
  return (
    <div id="hscs-nested-page">
      <h2>HS + Cache-Slot Nested Page</h2>
      <p>
        Nested Page Host Seq:{" "}
        <span id="hscs-nested-page-host-seq">{s.hscsNestedPageHostSeq}</span>
      </p>
      <HscsNestedPageSlotContent />
    </div>
  );
}

