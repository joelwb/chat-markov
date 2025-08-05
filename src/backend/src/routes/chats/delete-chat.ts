import { CHAT_PREFIX } from "../../domain/chat.ts";
import { Message, MESSAGE_PREFIX } from "../../domain/messages.ts";
import { getDatabasePath, getTrainFilesPath } from "../../utils.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class DeleteChatEndpoint extends BaseEndpoint {

  override handle(): void {
    this.app.delete(this.route + '/:chatId', async (c) => {
      const chatId = c.req.param('chatId');

      const chatDir = getTrainFilesPath(chatId);
      const dbFilePath = getDatabasePath(chatId);
      await Deno.remove(chatDir, { recursive: true});
      await Deno.remove(dbFilePath);

      const kv = await Deno.openKv();
      await kv.delete([CHAT_PREFIX, chatId]);

      const msgsKVEntry = await Array.fromAsync(kv.list<Message>({ prefix: [MESSAGE_PREFIX, chatId] }));
      for (const entry of msgsKVEntry) {
        await kv.delete(entry.key);
      }
      kv.close();

      return c.text(null);
    });
  }
}