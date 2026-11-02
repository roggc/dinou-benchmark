import { getRigorousState } from "@/shared/lib/rigorous-state";

export const revalidate = 3600;

export function getCacheTags() {
  return ["hs-l1-layout-tag"];
}

export async function getProps() {
  const s = getRigorousState();
  return {
    layoutPropsSeq: s.hsL1PropsSeq,
  };
}

