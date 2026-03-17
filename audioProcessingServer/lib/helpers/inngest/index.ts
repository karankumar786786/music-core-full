import { client } from "./client";
import { audioProcessingFunction } from "./functions/audioProcessing.function";
import { updateSongsTableFunction } from "./functions/updateSongTable.function";
import { setEmbeddingFlagsFunction } from "./functions/setEmbeddingFlags.function";
import { artistProcessingFunction } from "./functions/artistProcessing.function";
import { playlistProcessingFunction } from "./functions/playlistProcessing.function";

export { client };

export const functions = [
    audioProcessingFunction,
    updateSongsTableFunction,
    setEmbeddingFlagsFunction,
    artistProcessingFunction,
    playlistProcessingFunction
];