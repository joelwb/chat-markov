import { Hono } from 'hono';

import { cors } from 'hono/cors';
import { BaseController } from "./routes/base-controller.ts";
import { BaseEndpoint } from "./routes/base-endpoint.ts";
import { ChatController } from "./routes/chats/chat.controller.ts";
import { MessageController } from "./routes/messages/message.controller.ts";

const app = new Hono();
app.use('*', cors())

BaseEndpoint.setApp(app)
BaseController.init(ChatController);
BaseController.init(MessageController);

app.routes.forEach(r => console.log(`${r.method} ${r.path}`))

Deno.serve(app.fetch)

Deno.addSignalListener("SIGINT", () => {
    console.log("SIGINT received. Performing cleanup...");
    // Perform cleanup tasks here
    Deno.exit()
});