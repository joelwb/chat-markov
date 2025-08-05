import { SSEStreamingApi, streamSSE } from 'hono/streaming';
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { exists } from "jsr:@std/fs/exists";
import path from "node:path";
import { Chat, CHAT_PREFIX, ChatState } from "../../domain/chat.ts";
import { Message, MESSAGE_PREFIX, MessageSendedBy } from "../../domain/messages.ts";
import { getDatabasePath, getTrainFilesPath } from "../../utils.ts";
import { TrainWorkerInputMessage } from "../../workers/train.worker.ts";
import { TrainWorkerListener } from "../../workers/utils.ts";
import { WorkerManager } from "../../workers/worker-pool.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class TrainEndpointV2 extends BaseEndpoint {

    override handle(): void {
        this.app.post(this.route + '/:chatId/train-v2', async (c) => {
            const chatId = c.req.param('chatId');
            const db = new DB(getDatabasePath(chatId));
            const kv = await Deno.openKv();

            const chatKVEntry = await kv.get<Chat>([CHAT_PREFIX, chatId]);
            let chat = chatKVEntry.value;

            if (!chat || chat.state == ChatState.ERROR || chat.state == ChatState.TRAINING) {
                kv.close();
                c.status(400);
                return c.text(null!);
            }

            chat = { ...chat, hasDb: true, updatedDate: new Date() };
            await kv.set([CHAT_PREFIX, chat.id], chat);

            const body = await c.req.formData();
            const file = body.get('file')! as File;

            const msgId = crypto.randomUUID();
            const msg: Message = {
                chatId,
                createdDate: new Date(),
                filename: file.name,
                id: msgId,
                sendBy: MessageSendedBy.USER,
                value: chat.state == ChatState.NEW ? chat.name : 'Treinar com outro arquivo'
            }

            await kv.set([MESSAGE_PREFIX, chat.id, msgId], msg);

            kv.close();

            const uuid = crypto.randomUUID();

            const chatDir = getTrainFilesPath(chatId);
            if (!await exists(chatDir))
                await Deno.mkdir(chatDir);
            const filename = path.join(chatId, uuid + ".txt");
            const filepath = getTrainFilesPath(filename);

            await Deno.writeFile(filepath, file.stream())

            db.execute(`
                CREATE TABLE IF NOT EXISTS markov_chain (
                    context TEXT NOT NULL,
                    next_token TEXT NOT NULL,
                    count INTEGER NOT NULL,
                    PRIMARY KEY (context, next_token)
                ) WITHOUT ROWID;
            `);

            db.execute("PRAGMA journal_mode = WAL");
            db.execute("PRAGMA synchronous = OFF");
            db.execute("PRAGMA cache_size = -100000");
            db.execute("PRAGMA locking_mode = EXCLUSIVE");
            db.execute("PRAGMA temp_store = MEMORY");
            db.execute("PRAGMA foreign_keys = OFF");
            db.close();

            return streamSSE(
                c,
                async (stream) => {
                    await this.train(filename, chat, stream);
                },
                (err, stream) => {
                    stream.writeln('An error occurred!')
                    console.error(err);

                    return Promise.resolve();
                })
        });
    }

    train(filename: string, chat: Chat, streamResponse: SSEStreamingApi) {
        return new Promise((resolve, rejects) => {
            const worker = WorkerManager.create(chat.id, "train.worker.ts");

            TrainWorkerListener.listenAndSendUpdatesToClient(chat, resolve, rejects, streamResponse);

            worker.postMessage({ filename, chat } as TrainWorkerInputMessage);
        })
    }
}

