import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import { Chat } from "../domain/chat.ts";
import { DEFAULT_MARKOV_CHAIN_N, FlatMarkovChain } from "../markov/flat-markov-chain.ts";
import { getDatabasePath, getTrainFilesPath } from "../utils.ts";
import * as progress from 'npm:cli-progress';

export enum TrainWorkerTypeMessage {
    INITIATED,
    PROGRESS,
    FINALIZED,
}

export interface TrainWorkerMessage {
    type: TrainWorkerTypeMessage;
    data: number | null;
}

export interface TrainWorkerInputMessage {
    filename: string,
    chat: Chat;
}

async function train(filename: string, chat: Chat) {
    const filepath = getTrainFilesPath(filename);

    const file = await Deno.open(filepath, { read: true });
    const info = await Deno.stat(filepath);

    self.postMessage({type: TrainWorkerTypeMessage.INITIATED, data: null } as TrainWorkerMessage);

    const stream = file.readable
        .pipeThrough(new TextDecoderStream());

    const n = DEFAULT_MARKOV_CHAIN_N;
    const chunkSize = 65536; // 64 KB

    const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
    const max = Math.ceil(info.size / chunkSize) * n;
    bar.start(max, 0);

    const db = new DB(getDatabasePath(chat.id));

    const markovchain = new FlatMarkovChain(db, n);

    let chainStream: ReadableStream;
    let i = 0;
    for await (const chunk of stream) {

        chainStream = markovchain.addToChain(chunk);
        for await (const _ of chainStream) {

            bar.increment();
            i++;
            const trainProgress = Math.min(Math.ceil((i / max) * 100), 100);
            self.postMessage({ type: TrainWorkerTypeMessage.PROGRESS, data: trainProgress } as TrainWorkerMessage);
        }
    }

    self.postMessage({ type: TrainWorkerTypeMessage.FINALIZED, data: null } as TrainWorkerMessage);
    bar.stop();
}

self.onmessage = async (e: MessageEvent<TrainWorkerInputMessage>) => {
    await train(e.data.filename, e.data.chat);
}