import path from "node:path";

export function getDatabasePath(chatId: string) {
    return path.join('databases', `${chatId}.sqlite`)
}

export function getTrainFilesPath(filename: string) {
    return path.join('train-files', filename);
}