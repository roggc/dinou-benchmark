import { notFound } from "next/navigation";

const VALID_DEPTS = new Set(["eng", "sales"]);

export default async function HsDeptMembersPage({
  params,
}: {
  params: Promise<{ deptId: string }>;
}) {
  const { deptId } = await params;
  if (!VALID_DEPTS.has(deptId)) {
    notFound();
  }
  return (
    <div id="hs-dept-members-page">
      <h2>Dept Members ({deptId})</h2>
      <p id="hs-dept-members-label">Members list for {deptId}</p>
    </div>
  );
}

