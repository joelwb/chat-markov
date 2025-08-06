import { Chat, CHAT_PREFIX, ChatState } from "../../domain/chat.ts";
import { DEFAULT_MARKOV_CHAIN_N } from "../../markov/flat-markov-chain.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class CreateChatEndpoint extends BaseEndpoint {

  override handle(): void {
    this.app.post(this.route, async (c) => {
      const chatId = crypto.randomUUID();
      const body: { name: string, n: number } = await c.req.json();
      const kv = await Deno.openKv();
      const date = new Date();
      const n = body.n != null ? Math.max(Math.min(body.n, 15), 2) : null

      if (!body.name) {
        c.status(400);
        return c.text("'name' is required!");
      }

      const chat: Chat = {
        hasDb: false,
        name: body.name,
        id: chatId,
        state: ChatState.NEW,
        createdDate: date,
        updatedDate: date,
        n: n ?? DEFAULT_MARKOV_CHAIN_N
      };
      await kv.set([CHAT_PREFIX, chatId], chat);

      kv.close();
      c.status(201);
      return c.json(chat);
    });
  }
}