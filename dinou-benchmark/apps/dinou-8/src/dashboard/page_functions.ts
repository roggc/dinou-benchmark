import type { PageFunctions } from "dinou";

/**
 * revalidate = 0 opts out of static generation entirely: `getProps`
 * (and therefore the component) executes on every request.
 */
export const revalidate: PageFunctions["revalidate"] = 0;

