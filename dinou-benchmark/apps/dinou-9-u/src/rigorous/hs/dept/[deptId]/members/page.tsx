export default function HsDeptMembersPage({ params }: { params: { deptId: string } }) {
  return (
    <div id="hs-dept-members-page">
      <h2>Dept Members ({params.deptId})</h2>
      <p id="hs-dept-members-label">Members list for {params.deptId}</p>
    </div>
  );
}

