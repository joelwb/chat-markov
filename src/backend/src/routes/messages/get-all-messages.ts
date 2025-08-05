import { Message, MESSAGE_PREFIX } from "../../domain/messages.ts";
import { BaseEndpoint } from "../base-endpoint.ts";

export class GetAllMessagesEndpoint extends BaseEndpoint {

    override handle(): void {
        this.app.get(this.route, async (c) => {
            const chatId = c.req.param('chatId');
            const kv = await Deno.openKv();
            const msgsKVEntry = await Array.fromAsync(kv.list<Message>({ prefix: [MESSAGE_PREFIX, chatId] }));
            kv.close();

            const msgs = msgsKVEntry.map(x => x.value).sort((a, b) => a.createdDate.getTime() - b.createdDate.getTime());

            return c.json(msgs);
        });
    }
}