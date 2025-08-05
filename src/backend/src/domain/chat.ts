export enum ChatState {
    NEW = "new",
    TRAINING = "training",
    TRAINED = "trained",
    ERROR = "error"
}

export const CHAT_PREFIX = 'chats';

export interface Chat {
    id: string;
    hasDb: boolean;
    name: string;
    state: ChatState;
    createdDate: Date;
    updatedDate: Date;
}