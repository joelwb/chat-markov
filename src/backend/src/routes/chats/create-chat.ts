import { Chat, CHAT_PREFIX, ChatState } from "../../domain/chat.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class CreateChatEndpoint extends BaseEndpoint {

  override handle(): void {
    this.app.post(this.route, async (c) => {
      const chatId = crypto.randomUUID();
      const body: { name: string } = await c.req.json();
      const kv = await Deno.openKv();
      const date = new Date();
      const chat: Chat = {
        hasDb: false,
        name: body.name,
        id: chatId,
        state: ChatState.NEW,
        createdDate: date,
        updatedDate: date
      };
      await kv.set([CHAT_PREFIX, chatId], chat);

      kv.close();
      c.status(201);
      return c.json(chat);
    });
  }
}