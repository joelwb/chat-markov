export const MESSAGE_PREFIX = 'messages'

export enum MessageSendedBy {
    USER = 'user',
    MARKOV = 'markov'
}

export interface Message {
    id: string;
    chatId: string;
    createdDate: Date;
    value: string | null;
    filename: string | null;
    sendBy: MessageSendedBy
}