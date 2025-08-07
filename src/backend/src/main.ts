import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { exists } from "jsr:@std/fs/exists";
import { Chat, CHAT_PREFIX, ChatState } from "./domain/chat.ts";
import { BaseController } from "./routes/base-controller.ts";
import { BaseEndpoint } from "./routes/base-endpoint.ts";
import { ChatController } from "./routes/chats/chat.controller.ts";
import { MessageController } from "./routes/messages/message.controller.ts";
import { WorkerManager } from "./workers/worker-pool.ts";

const app = new Hono();
app.use('*', cors())

BaseEndpoint.setApp(app)
BaseController.init(ChatController);
BaseController.init(MessageController);

app.routes.forEach(r => console.log(`${r.method} ${r.path}`))

if (!exists('databases')) await Deno.mkdir('databases');
if (!exists('train-files')) await Deno.mkdir('train-files');

Deno.serve(app.fetch)

Deno.addSignalListener("SIGINT", async () => {
    console.log("SIGINT received. Performing cleanup...");
    // Perform cleanup tasks here
    const workers = WorkerManager.getAll();
    const kv = await Deno.openKv();
    
    for (const [chatId, worker] of Object.entries(workers)) {
        worker.terminate();
        const chatKVEntry = await kv.get<Chat>([CHAT_PREFIX, chatId]);
        let chat = chatKVEntry.value;
        chat = { ...chat, updatedDate: new Date(), state: ChatState.ERROR };
        await kv.set([CHAT_PREFIX, chat.id], chat);
    } 

    kv.close();
    Deno.exit()
});