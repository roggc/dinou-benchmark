import type { PageFunctions } from "dinou";
import { readMessages } from "@/shared/lib/store";
import { stamp } from "@/shared/lib/data";

/** SSR dinámico: la lista debe reflejar la última mutación en cada petición. */
export const revalidate: PageFunctions["revalidate"] = 0;

export const getProps: PageFunctions["getProps"] = async () => ({
  messages: await readMessages(),
  stamp: stamp(),
});

