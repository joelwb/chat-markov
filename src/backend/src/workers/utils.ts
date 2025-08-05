import { Chat, CHAT_PREFIX, ChatState } from "../domain/chat.ts";
import { Message, MESSAGE_PREFIX, MessageSendedBy } from "../domain/messages.ts";
import { StreamingApi } from "../utils.ts";
import { TrainWorkerMessage, TrainWorkerTypeMessage } from "./train.worker.ts";
import { WorkerManager } from "./worker-pool.ts";

type PromiseCallback = (value?: any) => void;

export class TrainWorkerListener {

    static listenAndSendUpdatesToClient(chat: Chat, resolve: PromiseCallback, rejects: PromiseCallback, streamResponse: StreamingApi) {
        WorkerManager.onMessage<TrainWorkerMessage>(chat.id, async msg => {
            if (msg.type == TrainWorkerTypeMessage.INITIATED) {
                const kv = await Deno.openKv();
                await kv.set([CHAT_PREFIX, chat.id], { ...chat, state: ChatState.TRAINING } as Chat);
                kv.close();

                streamResponse.write('0|');
            }
            else if (msg.type == TrainWorkerTypeMessage.PROGRESS) {
                streamResponse.write(msg.data! + '|');
            }
            else if (msg.type == TrainWorkerTypeMessage.FINALIZED) {
                const kv = await Deno.openKv();
                await kv.set([CHAT_PREFIX, chat.id], { ...chat, state: ChatState.TRAINED } as Chat);

                const msgId = crypto.randomUUID();
                const msg: Message = {
                    chatId: chat.id,
                    createdDate: new Date(),
                    filename: null,
                    id: msgId,
                    sendBy: MessageSendedBy.MARKOV,
                    value: "Treinado com sucesso!"
                }

                await kv.set([MESSAGE_PREFIX, msg.chatId, msgId], msg);
                kv.close();

                WorkerManager.remove(chat.id);

                resolve(null);
            }
        })

        WorkerManager.onError(chat.id, async e => {
            console.error('Erro no worker:', e.message);
            const kv = await Deno.openKv();
            await kv.set([CHAT_PREFIX, chat.id], { ...chat, state: ChatState.ERROR } as Chat);
            kv.close();

            WorkerManager.remove(chat.id);
            rejects();
        })
    }
} 