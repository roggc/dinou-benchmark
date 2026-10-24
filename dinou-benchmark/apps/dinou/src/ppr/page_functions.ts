import type { PageFunctions } from "dinou";
import { stamp } from "@/shared/lib/data";

/**
 * PPR por página. El `defineConfig` global de `dinou.config.mjs` no carga en
 * esta versión (ERR_UNKNOWN_FILE_EXTENSION), así que la configuración se hace
 * aquí, que además es el nivel con más prioridad. Ver README → "Diferencias".
 */
export const ppr: PageFunctions["ppr"] = true;

/** El shell es estático: `getProps` se ejecuta en build, no en cada request. */
export const getProps: PageFunctions["getProps"] = () => ({ shellStamp: stamp() });

