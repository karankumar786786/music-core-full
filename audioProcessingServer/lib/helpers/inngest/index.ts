import { client } from "./client";
import { audioProcessingFunction } from "./functions/audioProcessing.function";
import { updateSongsTableFunction } from "./functions/updateSongTable.function";
import { setRecombeeFlagsFunction } from "./functions/setRecombeeFlags.function";
import { artistProcessingFunction } from "./functions/artistProcessing.function";
import { playlistProcessingFunction } from "./functions/playlistProcessing.function";

export { client };

export const functions = [
    audioProcessingFunction,
    updateSongsTableFunction,
    setRecombeeFlagsFunction,
    artistProcessingFunction,
    playlistProcessingFunction
];