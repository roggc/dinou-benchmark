import type { PageFunctions } from "dinou";
import { getItem, itemIds, stamp } from "@/shared/lib/data";

/** 100 routes prerendered at build time. */
export const getStaticPaths: PageFunctions["getStaticPaths"] = () => itemIds();

/** ISR: HTML is reused for 60s and then regenerated in the background. */
export const revalidate: PageFunctions["revalidate"] = 60;

/** Only prerendered IDs exist: all others return 404. */
export const allowISG: PageFunctions["allowISG"] = false;

export const getProps: PageFunctions["getProps"] = (params) => {
  const id = (params as { id?: string } | undefined)?.id ?? "";
  return { item: getItem(id), stamp: stamp() };
};

