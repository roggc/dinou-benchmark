import { getRigorousState } from "@/shared/lib/rigorous-state";

export const revalidate = 3600;

export function getCacheTags() {
  return ["hs-index-page-tag"];
}

export async function getProps() {
  const s = getRigorousState();
  return {
    pagePropsSeq: s.hsIndexPropsSeq,
  };
}

