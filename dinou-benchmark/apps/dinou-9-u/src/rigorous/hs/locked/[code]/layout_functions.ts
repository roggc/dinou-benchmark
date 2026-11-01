export function getStaticPaths() {
  return ["alpha", "beta"];
}

export const allowISG = false;
export const revalidate = 3600;

