import { Livestream } from "./index";

let streams: Livestream[] = [];

export function pollStreams(): Livestream[]{
    return streams;
}