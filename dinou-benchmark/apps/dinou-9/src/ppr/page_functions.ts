import type { PageFunctions } from "dinou";
import { stamp } from "@/shared/lib/data";

/**
 * Per-page PPR configuration.
 */
export const ppr: PageFunctions["ppr"] = true;

/** The shell is static: `getProps` runs at build time, not on each request. */
export const getProps: PageFunctions["getProps"] = () => ({ shellStamp: stamp() });

