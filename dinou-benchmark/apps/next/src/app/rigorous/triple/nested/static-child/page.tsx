import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";

async function TsNestedStaticSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-nested-static-slot", "slot:ts-nested-static-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-nested-static-slot-box">
      Nested Static Slot Seq:{" "}
      <span id="ts-nested-static-slot-seq">{s.tsNestedStaticSlotSeq}</span>
    </div>
  );
}

async function getTsNestedStaticHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "ts-nested-static-child-tag",
    "page:/rigorous/triple/nested/static-child",
    "subtree:/rigorous/triple/nested/static-child"
  );
  return getRigorousState();
}

export default async function TripleNestedStaticChildPage() {
  const s = await getTsNestedStaticHostState();
  return (
    <div id="ts-nested-static-page">
      <h2>Triple Nested Static Child (ppr = false)</h2>
      <p>
        Nested Static Host Seq:{" "}
        <span id="ts-nested-static-host-seq">{s.tsNestedStaticHostSeq}</span>
      </p>
      <TsNestedStaticSlotContent />
    </div>
  );
}

