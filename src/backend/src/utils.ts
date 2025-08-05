import path from "node:path";

export function getDatabasePath(chatId: string) {
    return path.join('databases', `${chatId}.sqlite`)
}

export function getTrainFilesPath(filename: string) {
    return path.join('train-files', filename);
}

export type StreamingApi = {
    responseReadable: ReadableStream;
    /**
     * Whether the stream has been aborted.
     */
    aborted: boolean;
    /**
     * Whether the stream has been closed normally.
     */
    closed: boolean;
    write(input: Uint8Array | string): Promise<StreamingApi>;
    writeln(input: string): Promise<StreamingApi>;
    sleep(ms: number): Promise<unknown>;
    close(): Promise<void>;
    pipe(body: ReadableStream): Promise<void>;
    onAbort(listener: () => void | Promise<void>): void;
    /**
     * Abort the stream.
     * You can call this method when stream is aborted by external event.
     */
    abort(): void;
}