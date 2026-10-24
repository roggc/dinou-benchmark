import type { PageFunctions } from "dinou";

/**
 * revalidate = 0 escapa por completo de la generación estática: `getProps`
 * (y por tanto el componente) se ejecuta en cada petición.
 */
export const revalidate: PageFunctions["revalidate"] = 0;

