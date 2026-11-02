import { notFound } from "next/navigation";

const VALID_DEPTS = new Set(["eng", "sales"]);

export default async function HsDeptPage({
  params,
}: {
  params: Promise<{ deptId: string }>;
}) {
  const { deptId } = await params;
  if (!VALID_DEPTS.has(deptId)) {
    notFound();
  }
  return (
    <div id="hs-dept-page">
      <h2>Dept Overview</h2>
      <p>
        Active Dept Param: <span id="hs-dept-page-param">{deptId}</span>
      </p>
    </div>
  );
}

