import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import * as progress from 'npm:cli-progress';
import { Chat } from "../domain/chat.ts";
import { DEFAULT_MARKOV_CHAIN_N, FlatMarkovChain } from "../markov/flat-markov-chain.ts";
import { getDatabasePath, getTrainFilesPath } from "../utils.ts";
import { BaseWorker } from "./base-worker.ts";

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

export class TrainWorker extends BaseWorker<TrainWorkerInputMessage, TrainWorkerMessage> {
  public async *handle({ filename, chat }: TrainWorkerInputMessage): AsyncIterable<TrainWorkerMessage> {
    const filepath = getTrainFilesPath(filename);
    const file = await Deno.open(filepath, { read: true });
    const info = await Deno.stat(filepath);

    yield { type: TrainWorkerTypeMessage.INITIATED, data: null };

    const stream = file.readable.pipeThrough(new TextDecoderStream());

    const n = chat.n ?? DEFAULT_MARKOV_CHAIN_N;
    const chunkSize = 65536;
    const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
    const max = Math.ceil(info.size / chunkSize) * n;
    bar.start(max, 0);

    const db = new DB(getDatabasePath(chat.id));
    const markovchain = new FlatMarkovChain(db, n);

    let i = 0;
    for await (const chunk of stream) {
      const chainStream = markovchain.addToChain(chunk);
      for await (const _ of chainStream) {
        bar.increment();
        i++;
        const trainProgress = Math.min(Math.ceil((i / max) * 100), 100);
        yield { type: TrainWorkerTypeMessage.PROGRESS, data: trainProgress };
      }
    }

    yield { type: TrainWorkerTypeMessage.FINALIZED, data: null };
    bar.stop();
  }
}

if (typeof self !== "undefined" && "postMessage" in self) {
  new TrainWorker(); // para registrar o `onmessage` real
}