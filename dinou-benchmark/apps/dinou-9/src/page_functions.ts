import type { PageFunctions } from "dinou";
import { listItems, stamp } from "@/shared/lib/data";

/**
 * Pure SSG: `revalidate` is not exported, so Dinou prerenders the page
 * once at build time and serves it statically.
 */
export const getProps: PageFunctions["getProps"] = () => ({
  items: listItems(),
  stamp: stamp(),
});

