import type { PageFunctions } from "dinou";
import { getItem, itemIds, stamp } from "@/shared/lib/data";

/** 100 rutas prerenderizadas en build. */
export const getStaticPaths: PageFunctions["getStaticPaths"] = () => itemIds();

/** ISR: el HTML se reutiliza 60 s y luego se regenera en segundo plano. */
export const revalidate: PageFunctions["revalidate"] = 60;

/** Solo existen los ids prerenderizados: el resto devuelve 404. */
export const allowISG: PageFunctions["allowISG"] = false;

export const getProps: PageFunctions["getProps"] = (params) => {
  const id = (params as { id?: string } | undefined)?.id ?? "";
  return { item: getItem(id), stamp: stamp() };
};

