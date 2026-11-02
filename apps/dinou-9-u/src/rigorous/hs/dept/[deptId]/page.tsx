export default function HsDeptPage({ params }: { params: { deptId: string } }) {
  return (
    <div id="hs-dept-page">
      <h2>Dept Overview</h2>
      <p>
        Active Dept Param: <span id="hs-dept-page-param">{params.deptId}</span>
      </p>
    </div>
  );
}

