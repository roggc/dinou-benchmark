import type { PageFunctions } from "dinou";
import { stamp } from "@/shared/lib/data";

/**
 * Per-page PPR. In Dinou 8, global `defineConfig` in `dinou.config.mjs` had loading
 * issues, so configuration is done here at the page level. See README.
 */
export const ppr: PageFunctions["ppr"] = true;

/** The shell is static: `getProps` runs at build time, not on each request. */
export const getProps: PageFunctions["getProps"] = () => ({ shellStamp: stamp() });

