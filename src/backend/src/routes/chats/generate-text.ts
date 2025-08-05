import { streamText } from 'hono/streaming';
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { Chat, CHAT_PREFIX, ChatState } from "../../domain/chat.ts";
import { Message, MESSAGE_PREFIX, MessageSendedBy } from "../../domain/messages.ts";
import { DEFAULT_MARKOV_CHAIN_N, FlatMarkovChain } from "../../markov/flat-markov-chain.ts";
import { getDatabasePath } from "../../utils.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class GenerateTextEndpoint extends BaseEndpoint {

    override handle(): void {
        this.app.post(this.route + '/:chatId/generate-text', async (c) => {
            const chatId = c.req.param('chatId');
            const body: { prompt: string } = await c.req.json();

            let kv = await Deno.openKv();
            const chatKVEntry = await kv.get<Chat>([CHAT_PREFIX, chatId]);
            let chat = chatKVEntry.value;
            if (!chatKVEntry.value) {
                kv.close();
                c.status(404);
                return c.text(null!);
            }

            else if (!chatKVEntry.value.hasDb || chatKVEntry.value.state != ChatState.TRAINED) {
                kv.close();
                c.status(400);
                return c.text('chat não está treinado');
            }

            chat = { ...chat, updatedDate: new Date() };
            await kv.set([CHAT_PREFIX, chat.id], chat);

            const msgId = crypto.randomUUID();
            const msg: Message = {
                chatId,
                createdDate: new Date(),
                filename: null,
                id: msgId,
                sendBy: MessageSendedBy.USER,
                value: body.prompt
            }

            await kv.set([MESSAGE_PREFIX, chat.id, msgId], msg);

            kv.close();

            const db = new DB(getDatabasePath(chatId));
            const markovchain = new FlatMarkovChain(db, DEFAULT_MARKOV_CHAIN_N);

            return streamText(
                c,
                async (stream) => {
                    const generatedTextStream = markovchain.generateText(body.prompt);

                    let canceled = false;
                    stream.onAbort(() => {
                        canceled = true;
                    });

                    const msgValue = [];

                    for await (const token of generatedTextStream) {
                        if (canceled) break;
                        await stream.write(token);
                        msgValue.push(token);
                        await stream.sleep(5);
                    }
                    
                    db.close();
                    const msgId = crypto.randomUUID();
                    const msg: Message = {
                        chatId,
                        createdDate: new Date(),
                        filename: null,
                        id: msgId,
                        sendBy: MessageSendedBy.MARKOV,
                        value: msgValue.join("")
                    };

                    kv = await Deno.openKv();
                    await kv.set([MESSAGE_PREFIX, chatId, msgId], msg);
                    kv.close()
                },
                (err, stream) => {
                    stream.writeln('An error occurred!')
                    console.error(err);

                    return Promise.resolve();
                })
        });
    }
}