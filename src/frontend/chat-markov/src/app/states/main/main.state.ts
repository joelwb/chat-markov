import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { insertItem, patch, removeItem, updateItem } from '@ngxs/store/operators';
import { tap } from 'rxjs';
import { Chat, ChatState } from '../../models/chat';
import { ChatService } from '../../services/chat-service/chat-service';
import { MainActions } from './main.actions';

export interface MainStateModel {
    selectedChat: Chat | null;
    chats: Chat[];
    trainingProgress: Record<string, number>;
    generatingTextChatsId: string[];
    selectedModelN: number
}

@State<MainStateModel>({
    name: 'main',
    defaults: {
        selectedChat: null,
        chats: [],
        trainingProgress: {},
        generatingTextChatsId: [],
        selectedModelN: 4
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
        return state.selectedChat?.id ? state.trainingProgress[state.selectedChat.id] ?? null : null;
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

    @Selector()
    static selectedModelN(state: MainStateModel): number {
        return state.selectedChat ? state.selectedChat.n ?? 4 : state.selectedModelN;
    }

    @Action(MainActions.SelectChat)
    selectChat(ctx: StateContext<MainStateModel>, { selectedChat }: MainActions.SelectChat) {
        ctx.patchState({ selectedChat, selectedModelN: 4 });
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

        const copyTrainingProgress = { ...trainingProgress };
        if (progress === null || progress === -1) {
            delete copyTrainingProgress[chatId];
        } else {
            copyTrainingProgress[chatId] = progress;
        }

        const chat = chats.find(x => x.id == chatId)!;
        const previousState = chat.state;
        chat.state = progress === null ? ChatState.TRAINED : ChatState.TRAINING;

        if (selectedChat?.id == chatId) {
            selectedChat = chat;
        }

        if (progress === -1 && previousState != ChatState.TRAINING) {
            ctx.setState(patch({
                chats: removeItem(x => x.id == chatId),
            }));

            ctx.setState(patch({
                chats: insertItem(chat, 0)
            }));
        } else {
            ctx.setState(patch({
                chats: updateItem(x => x.id == chatId, chat),
            }));
        }

        ctx.patchState({ trainingProgress: copyTrainingProgress, selectedChat })
    }

    @Action(MainActions.LoadChats)
    loadChats(ctx: StateContext<MainStateModel>) {
        return this.chatService.getAll()
            .pipe(
                tap((chats) => ctx.patchState({ chats }))
            );
    }

    @Action(MainActions.SelectModelN)
    selectModelN(ctx: StateContext<MainStateModel>, { n }: MainActions.SelectModelN) {
        ctx.patchState({ selectedModelN: n });
    }
}