import type { PageFunctions } from "dinou";
import { readMessages } from "@/shared/lib/store";
import { stamp } from "@/shared/lib/data";

/** Dynamic SSR: the list must reflect the latest mutation on each request. */
export const revalidate: PageFunctions["revalidate"] = 0;

export const getProps: PageFunctions["getProps"] = async () => ({
  messages: await readMessages(),
  stamp: stamp(),
});

