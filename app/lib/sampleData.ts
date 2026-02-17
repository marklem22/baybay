import { buildTimeline, type Room } from "./roomData";
import hutsData from "./huts.json";

export const sampleHuts: Room[] = hutsData as Room[];
export const sampleTimeline = buildTimeline(sampleHuts.slice(0, 6), 14);
