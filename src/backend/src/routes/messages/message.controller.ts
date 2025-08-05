import { BaseController } from "../base-controller.ts";
import { BaseEndpoint } from "../base-endpoint.ts";
import { GetAllMessagesEndpoint } from "./get-all-messages.ts";

export class MessageController extends BaseController {
  private static route = '/chats/:chatId/messages';
  
  handle(): void {
    BaseEndpoint.initEndpoint(GetAllMessagesEndpoint, MessageController.route);
  }
}