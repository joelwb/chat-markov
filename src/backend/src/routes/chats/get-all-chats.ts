import { Chat, CHAT_PREFIX } from "../../domain/chat.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class GetAllChatEndpoint extends BaseEndpoint {

  override handle(): void {
    this.app.get(this.route, async (c) => {
      const kv = await Deno.openKv();
      const chatsKVEntry = await Array.fromAsync(kv.list<Chat>({ prefix: [CHAT_PREFIX]}));
      kv.close();

      const chats = chatsKVEntry.map(x => x.value).sort((a, b) => b.updatedDate.getTime() - a.updatedDate.getTime());
      
      return c.json(chats);
    });
  }
}