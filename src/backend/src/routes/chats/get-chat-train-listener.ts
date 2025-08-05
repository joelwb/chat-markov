import { SSEStreamingApi, streamSSE } from "hono/streaming";
import { Chat, CHAT_PREFIX, ChatState } from "../../domain/chat.ts";
import { TrainWorkerListener } from "../../workers/utils.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class TrainListenerEndpoint extends BaseEndpoint {

  override handle(): void {
    this.app.get(this.route + '/:chatId/train-listener', async (c) => {
      const chatId = c.req.param('chatId');

      const kv = await Deno.openKv();
      const chatKVEntry = await kv.get<Chat>([CHAT_PREFIX, chatId]);
      kv.close();

      if (!chatKVEntry.value) return c.status(404);

      else if (!chatKVEntry.value.hasDb || chatKVEntry.value.state != ChatState.TRAINING) {
        kv.close();
        c.status(400);
        return c.text('chat não está treinando no momento');
      }

      return streamSSE(
        c,
        async (stream) => {
          await this.listen(chatKVEntry.value, stream);
        },
        (err, stream) => {
          stream.writeln('An error occurred!')
          console.error(err);

          return Promise.resolve();
        })
    });
  }

  listen(chat: Chat, streamResponse: SSEStreamingApi) {
    return new Promise((resolve, rejects) => {
      TrainWorkerListener.listenAndSendUpdatesToClient(chat, resolve, rejects, streamResponse);
    })
  }
}