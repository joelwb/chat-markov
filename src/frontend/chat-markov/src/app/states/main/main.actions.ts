import { Chat } from "../../models/chat";

const ACTION_SCOPE = '[MAIN]';

export namespace MainActions {
  export class SelectChat {
    static readonly type = `${ACTION_SCOPE} SelectChat`;

    constructor(public selectedChat: Chat | null) { }
  }

  export class SetTrainingProgress {
    static readonly type = `${ACTION_SCOPE} SetTrainingProgress`;

    constructor(public chatId: string, public progress: number | null) { }
  }

  export class LoadChats {
    static readonly type = `${ACTION_SCOPE} LoadChats`;
  }

  export class AddChat {
    static readonly type = `${ACTION_SCOPE} AddChat`;

    constructor(public chat: Chat) { }
  }

  export class AddChatToGeneratingText {
    static readonly type = `${ACTION_SCOPE} AddChatToGeneratingText`;

    constructor(public chat: Chat) { }
  }

  export class RemoveChatFromGeneratingText {
    static readonly type = `${ACTION_SCOPE} RemoveChatFromGeneratingText`;

    constructor(public chat: Chat) { }
  }

  export class ToogleSideBar {
    static readonly type = `${ACTION_SCOPE} ToogleNavBar`;
  }

  export class SelectModelN {
    static readonly type = `${ACTION_SCOPE} SelectModelN`;

    constructor(public n: number) { }
  }
}