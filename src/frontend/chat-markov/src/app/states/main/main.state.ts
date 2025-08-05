import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { insertItem, patch, removeItem } from '@ngxs/store/operators';
import { tap } from 'rxjs';
import { Chat, ChatState } from '../../models/chat';
import { ChatService } from '../../services/chat-service/chat-service';
import { MainActions } from './main.actions';

export interface MainStateModel {
    selectedChat: Chat | null;
    chats: Chat[];
    trainingProgress: Record<string, number>;
    generatingTextChatsId: string[];
}

@State<MainStateModel>({
    name: 'main',
    defaults: {
        selectedChat: null,
        chats: [],
        trainingProgress: {},
        generatingTextChatsId: []
    }
})
@Injectable()
export class MainState {
    private readonly chatService = inject(ChatService);

    @Selector()
    static chats(state: MainStateModel): Chat[] {
        return state.chats;
    }

    @Selector()
    static selectedChat(state: MainStateModel): Chat | null {
        return state.selectedChat;
    }

    @Selector()
    static allTrainingChatsId(state: MainStateModel): string[] {
        return state.chats.filter(x => x.state == ChatState.TRAINING).map(x => x.id);
    }

    @Selector()
    static trainingProgressOfSelectedChat(state: MainStateModel): number | null {
        return state.selectedChat?.id ? state.trainingProgress[state.selectedChat.id] : null;
    }

    
    @Selector()
    static isTrainingSelectedChat(state: MainStateModel): boolean {
        return state.selectedChat?.id ? MainState.allTrainingChatsId(state).includes(state.selectedChat.id) : false;
    }

    @Selector()
    static isGeneratingTextForSelectedChat(state: MainStateModel): boolean {
        return state.selectedChat?.id ? state.generatingTextChatsId.includes(state.selectedChat.id) : false
    }

    @Selector()
    static generatingTextChatsId(state: MainStateModel): string[] {
        return state.generatingTextChatsId;
    }

    @Action(MainActions.SelectChat)
    selectChat(ctx: StateContext<MainStateModel>, { selectedChat }: MainActions.SelectChat) {
        ctx.patchState({ selectedChat });
    }

    @Action(MainActions.AddChat)
    addChat(ctx: StateContext<MainStateModel>, { chat }: MainActions.AddChat) {
        ctx.setState(patch({
            chats: insertItem(chat, 0)
        }));
    }

    @Action(MainActions.AddChatToGeneratingText)
    addChatToGeneretingText(ctx: StateContext<MainStateModel>, { chat }: MainActions.AddChatToGeneratingText) {
        ctx.setState(patch({
            generatingTextChatsId: insertItem(chat.id),
            chats: removeItem(x => x.id == chat.id)
        }));

        ctx.setState(patch({
            chats: insertItem(chat, 0)
        }));
    }

    @Action(MainActions.RemoveChatFromGeneratingText)
    removeChatFromGeneratingText(ctx: StateContext<MainStateModel>, { chat }: MainActions.RemoveChatFromGeneratingText) {
        ctx.setState(patch({
            generatingTextChatsId: removeItem(chatId => chatId == chat.id)
        }));
    }

    @Action(MainActions.SetTrainingProgress)
    setTrainingProgress(ctx: StateContext<MainStateModel>, { chatId, progress }: MainActions.SetTrainingProgress) {
        let { trainingProgress, selectedChat, chats } = ctx.getState();

        const copyTrainingProgress = {...trainingProgress};
        if (progress === null) {
            delete copyTrainingProgress[chatId];
        } else {
            copyTrainingProgress[chatId] = progress;
        }

        const chat = chats.find(x => x.id == chatId)!;
        chat.state = progress === null ? ChatState.TRAINED : ChatState.TRAINING;

        if (selectedChat?.id == chatId) {
            selectedChat = chat;
        }

        ctx.setState(patch({
            chats: removeItem<Chat>(x => x.id == chatId),
        }));

        ctx.setState(patch({
            chats: insertItem(chat, 0)
        }));

        ctx.patchState({ trainingProgress: copyTrainingProgress, selectedChat })
    }

    @Action(MainActions.LoadChats)
    loadChats(ctx: StateContext<MainStateModel>) {
        return this.chatService.getAll()
            .pipe(
                tap((chats) => ctx.patchState({ chats }))
            );
    }
}