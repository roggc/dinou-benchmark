import type { ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";

const VALID_DEPTS = new Set(["eng", "sales"]);

export function generateStaticParams() {
  return [{ deptId: "eng" }, { deptId: "sales" }];
}

async function getHsDeptLayoutState(deptId: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(`layout:/rigorous/hs/dept/${deptId}`, "subtree:/rigorous/hs");
  return getRigorousState();
}

export default async function HsDeptLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ deptId: string }>;
}) {
  const { deptId } = await params;
  if (!VALID_DEPTS.has(deptId)) {
    notFound();
  }
  const s = await getHsDeptLayoutState(deptId);
  return (
    <div id="hs-dept-layout" style={{ border: "1px dashed #6a1b9a", padding: 8, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <strong>Dept Layout:</strong>
        <span id="hs-dept-param">{deptId}</span>
        <span>
          Seq: <span id="hs-dept-seq">{s.hsDeptSeq}</span>
        </span>
        <RigorousClientProbe id="hs-dept-client" label="Dept Client" />
      </div>
      <div id="hs-dept-outlet">{children}</div>
    </div>
  );
}

