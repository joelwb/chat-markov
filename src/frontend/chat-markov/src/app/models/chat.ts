export enum ChatState {
    NEW = "new",
    TRAINING = "training",
    TRAINED = "trained",
    ERROR = "error"
}

export interface Chat {
    id: string;
    hasDb: boolean;
    name: string;
    state: ChatState;
    createDate: Date;
    n: number
}