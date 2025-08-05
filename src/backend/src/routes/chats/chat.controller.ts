import { BaseController } from "../base-controller.ts";
import { BaseEndpoint } from "../base-endpoint.ts";
import { CreateChatEndpoint } from "./create-chat.ts";
import { DeleteChatEndpoint } from "./delete-chat.ts";
import { GenerateTextEndpoint } from "./generate-text.ts";
import { GetAllChatEndpoint } from "./get-all-chats.ts";
import { TrainListenerEndpoint } from "./get-chat-train-listener.ts";
import { GetChatEndpoint } from "./get-chat.ts";
import { TrainEndpointV2 } from "./train-v2.ts";

export class ChatController extends BaseController {
  private static route = '/chats';

  handle(): void {
    BaseEndpoint.initEndpoint(CreateChatEndpoint, ChatController.route);
    BaseEndpoint.initEndpoint(TrainEndpointV2, ChatController.route);
    BaseEndpoint.initEndpoint(GenerateTextEndpoint, ChatController.route);
    BaseEndpoint.initEndpoint(GetChatEndpoint, ChatController.route);
    BaseEndpoint.initEndpoint(GetAllChatEndpoint, ChatController.route);
    BaseEndpoint.initEndpoint(DeleteChatEndpoint, ChatController.route);
    BaseEndpoint.initEndpoint(TrainListenerEndpoint, ChatController.route);
  }
}