const VALID_DEPTS = new Set(["eng", "sales"]);

export function validateParams({ deptId }: { deptId: string }) {
  return VALID_DEPTS.has(deptId);
}

export function getStaticPaths() {
  return ["eng", "sales"];
}

export const revalidate = 3600;

