import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { Actions, createDispatchMap, createSelectMap, ofActionCompleted } from '@ngxs/store';
import { catchError, delay, filter, first, map, Observable, of, switchMap, tap } from 'rxjs';
import { Chat, ChatState } from '../../models/chat';
import { Message, MessageSendedBy } from '../../models/message';
import { ChatService } from '../../services/chat-service/chat-service';
import { MessageService } from '../../services/message-service/message-service';
import { MainActions } from '../../states/main/main.actions';
import { MainState } from '../../states/main/main.state';
import { PromptArea } from '../prompt-area/prompt-area';

const numeroMagico = 345.575;
@Component({
  selector: 'app-chat-container',
  imports: [PromptArea, RouterModule],
  standalone: true,
  templateUrl: './chat-container.html',
  styleUrl: './chat-container.scss'
})
export class ChatContainer {
  private readonly el = inject(ElementRef);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly msgService = inject(MessageService);
  private readonly actions$ = inject(Actions);

  readonly selectors = createSelectMap({
    selectedChat: MainState.selectedChat,
    isTrainingSelectedChat: MainState.isTrainingSelectedChat,
    trainingProgress: MainState.trainingProgressOfSelectedChat
  })

  readonly actions = createDispatchMap({
    setTrainingProgress: MainActions.SetTrainingProgress,
    addChat: MainActions.AddChat,
    addChatToGeneretingText: MainActions.AddChatToGeneratingText,
    removeChatFromGeneratingText: MainActions.RemoveChatFromGeneratingText
  })

  readonly creatingNewChat = signal(false);
  readonly progressConvertedToDashoffset = computed(() => numeroMagico * (1 - (this.selectors.trainingProgress() ?? 0) / 100));
  readonly messages = signal<Message[]>([]);
  readonly isAtBottom = signal<boolean>(true);

  readonly sendedBy = MessageSendedBy;

  readonly scrollToMe = viewChild<ElementRef<HTMLDivElement>>('scrollToMe');
  readonly chatScroll = viewChild<ElementRef<HTMLDivElement>>('chatScroll');

  constructor() {
    this.actions$.pipe(
      ofActionCompleted(MainActions.SelectChat),
      tap(() => this.isAtBottom.set(true)),
      map(x => x.action.selectedChat),
      switchMap(chat => !!chat ?
        this.msgService.getAll(chat!.id).pipe(map(msgs => ({ msgs, chat })))
        :
        of({ msgs: [], chat })
      ),
      tap(({ msgs }) => this.messages.set(msgs)),
      tap(() => this.scrollTop()),
      delay(100),
      tap(() => this.scrollToBottom()),
      switchMap(({ chat }) => chat?.state == ChatState.TRAINING && this.selectors.trainingProgress() == null ?
        this.chatService.listenToTrain(chat!.id)
          .pipe(
            map(progress => ({ progress, chat: chat! })),
            this.listenTrainProgress()
          )
        :
        of(null)
      ),
      takeUntilDestroyed()
    ).subscribe();
  }

  scrollTop() {
    this.chatScroll()?.nativeElement.scrollTo({
      behavior: 'instant',
      top: 0
    });
  }

  scrollToBottom() {
    this.scrollToMe()?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }

  onContainerScroll(): void {
    const element = this.chatScroll()!.nativeElement;
    const isAtBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 60; // Add a small threshold for precision
    this.isAtBottom.set(isAtBottom);
  }

  send([promptText, file]: [string, File | null]) {
    if (!this.selectors.selectedChat()) {
      this.createNewChat(promptText, file!);
    }
    else {
      if (promptText) this.generateMessage(promptText);
      else this.train(this.selectors.selectedChat()!, file!);
    }
  }



  private listenTrainProgress() {
    return (source: Observable<{ progress: null | number, chat: Chat }>) => {
      return source.pipe(
        tap(({ progress, chat }) => {
          if (progress == 100) this.actions.setTrainingProgress(chat.id, null);
          else this.actions.setTrainingProgress(chat.id, progress);
        }),
        filter(({ progress }) => progress == 100),
        first(),
        delay(100),
        switchMap(({ chat }) => this.msgService.getAll(chat.id)),
        tap(messages => this.messages.set(messages))
      );
    };
  }

  createNewChat(promptText: string, file: File) {
    this.chatService.create(promptText)
      .pipe(
        tap(chat => {
          this.actions.addChat(chat);
          this.messages.set([{ chatId: chat.id, sendBy: MessageSendedBy.USER, value: promptText, filename: file!.name } as Message]);
          const target = this.el.nativeElement.querySelector('.empty-state') as HTMLElement;

          target.addEventListener('transitionend', () => {
            this.creatingNewChat.set(false)
            this.router.navigate(['/', chat.id])
          }, { once: true });

          this.creatingNewChat.set(true);
        }),
        switchMap((chat) =>
          this.chatService.train(chat.id, file!).
            pipe(map(progress => ({ progress, chat }))),
        ),
        this.listenTrainProgress()
      ).subscribe();
  }

  train(chat: Chat, file: File) {
    let hasTapped = false;
    this.chatService.train(chat.id, file).
      pipe(
        tap(() => {
          if (!hasTapped) this.messages.update(previous => [...previous, { chatId: chat.id, sendBy: MessageSendedBy.USER, value: 'Treinar com outro arquivo', filename: file!.name } as Message]);
          hasTapped = true;
        }),
        map(progress => ({ progress, chat })),
        this.listenTrainProgress()
      ).subscribe();
  }

  generateMessage(promptText: string) {
    const chatToGenerateText = this.selectors.selectedChat()!
    const chatIdToGenerateText = chatToGenerateText.id;

    const promptMsg: Message = {
      chatId: chatIdToGenerateText,
      createdDate: new Date(),
      filename: null,
      value: promptText,
      id: "temp1",
      sendBy: MessageSendedBy.USER
    }

    const generatedMsg: Message = {
      chatId: chatIdToGenerateText,
      createdDate: new Date(),
      filename: null,
      value: "█",
      id: "temp2",
      sendBy: MessageSendedBy.MARKOV
    }

    this.messages.update(previous => [...previous, promptMsg, generatedMsg]);

    setTimeout(() => {
      const chats = Array.from(this.chatScroll()!.nativeElement.querySelectorAll('.contained.msg')! as NodeListOf<HTMLDivElement>);
      chats.forEach(x => x.style.minHeight = '');

      const lastChat = chats.pop()!;
      lastChat.style.minHeight = 'calc(100% - 170px)';

      this.scrollToBottom();
    }, 100);

    this.actions.addChatToGeneretingText(chatToGenerateText);
    const sub = this.chatService.generateText(chatIdToGenerateText, promptText)
      .pipe(
        tap(({ text }) => {
          if (this.selectors.selectedChat()!.id == chatIdToGenerateText) {
            this.messages.update(previous => {
              generatedMsg.value = text + '█';
              return [...previous.slice(0, -2), promptMsg, generatedMsg];
            });

          }
        }),
        filter(({ done }) => done),
        tap(() => this.actions.removeChatFromGeneratingText(chatToGenerateText)),
        catchError(error => {
          this.actions.removeChatFromGeneratingText(chatToGenerateText);
          return error;
        })
      ).subscribe();

    this.actions$
      .pipe(
        ofActionCompleted(MainActions.RemoveChatFromGeneratingText),
        map(action => action.action.chat),
        filter(chat => chat.id == chatIdToGenerateText),
        first(),
        tap(() => {
          if (!sub.closed) sub.unsubscribe();
        }),
        delay(100),
        switchMap(() => this.msgService.getAll(chatIdToGenerateText)),
        tap(messages => {
          if (this.selectors.selectedChat()!.id == chatIdToGenerateText) this.messages.set(messages)
        })
      ).subscribe();
  }
}
