import type { PageFunctions } from "dinou";
import { listItems, stamp } from "@/shared/lib/data";

/**
 * SSG puro: no se exporta `revalidate`, así que Dinou prerenderiza la página
 * una vez en build y la sirve estática para siempre.
 */
export const getProps: PageFunctions["getProps"] = () => ({
  items: listItems(),
  stamp: stamp(),
});

