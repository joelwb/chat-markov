import { Chat, CHAT_PREFIX } from "../../domain/chat.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class GetChatEndpoint extends BaseEndpoint {

  override handle(): void {
    this.app.get(this.route+'/:chatId', async (c) => {
      const chatId = c.req.param('chatId');

      const kv = await Deno.openKv();
      const chatKVEntry = await kv.get<Chat>([CHAT_PREFIX, chatId]);
      kv.close();

      if (!chatKVEntry.value) return c.status(404);
      
      return c.json(chatKVEntry.value);
    });
  }
}