import { Component, effect, ElementRef, inject, input, OnInit, signal, untracked } from '@angular/core';
import { createDispatchMap, select } from '@ngxs/store';
import { first, tap } from 'rxjs';
import { ChatContainer } from '../../components/chat-container/chat-container';
import { Header } from '../../components/header/header';
import { SideBar } from '../../components/side-bar/side-bar';
import { MainActions } from '../../states/main/main.actions';
import { MainState } from '../../states/main/main.state';

@Component({
  selector: 'app-main',
  imports: [SideBar, ChatContainer, Header],
  standalone: true,
  templateUrl: './main.html',
  styleUrl: './main.scss'
})
export class Main implements OnInit {
  readonly chatId = input<string | 'new'>('new');

  readonly chats = select(MainState.chats);
  readonly selectedChat = select(MainState.selectedChat);
  readonly actions = createDispatchMap({
    loadChats: MainActions.LoadChats,
    selectChat: MainActions.SelectChat
  });

  private readonly el = inject(ElementRef);
  showBackground = signal(false);
  exiting = signal(false);

  constructor() {
    effect(() => {
      const chatId = this.chatId();
      const chat = untracked(() => this.chats().find(c => c.id == chatId) ?? null);
      const selectedChat = untracked(() => this.selectedChat());

      if (chatId != 'new' && !selectedChat) {
        const target = this.el.nativeElement.querySelector('.background');
        target?.addEventListener('transitionend', () => this.hideBackground());
        if (target) this.exiting.set(true);
      }
      if (chatId == 'new') {
        this.showBackground.set(true);
      }

      if (chat?.id !== selectedChat?.id) this.actions.selectChat(chat);
    })
  }

  hideBackground() {
    this.showBackground.set(false);
    this.exiting.set(false);
  }

  ngOnInit(): void {
    if (this.chats().length == 0) {
      this.actions.loadChats()
        .pipe(
          first(),
          tap(() => {
            const chat = this.chats().find(c => c.id == this.chatId());
            if (chat) this.actions.selectChat(chat);
          })
        ).subscribe();
    }
  }
}
