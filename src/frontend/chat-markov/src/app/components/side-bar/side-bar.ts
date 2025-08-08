import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayModule } from '@angular/cdk/overlay';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Actions, createDispatchMap, createSelectMap, ofActionDispatched } from '@ngxs/store';
import { first, switchMap, tap } from 'rxjs';
import { ClickStopPropagation } from '../../directives/click-stop-propagration.directive';
import { ChatService } from '../../services/chat-service/chat-service';
import { MainActions } from '../../states/main/main.actions';
import { MainState } from '../../states/main/main.state';

@Component({
  selector: 'app-side-bar',
  imports: [RouterLink, ClickStopPropagation, OverlayModule, RouterModule],
  standalone: true,
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss'
})
export class SideBar {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly selectors = createSelectMap({
    chats: MainState.chats,
    selectedChat: MainState.selectedChat,
    generatingTextChatsId: MainState.generatingTextChatsId,
    allTrainingChatsId: MainState.allTrainingChatsId
  })

  readonly actions = createDispatchMap({ 
    loadChats: MainActions.LoadChats
  })

  readonly popoverOpen = signal<string | null>(null);
  readonly isOpen = signal<boolean>(false);

  constructor(){
    this.actions$.pipe(
      ofActionDispatched(MainActions.ToogleSideBar),
      tap(() => this.isOpen.update(isOpen => !isOpen)),
      takeUntilDestroyed()
    ).subscribe();


    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(takeUntilDestroyed()) 
      .subscribe(result => this.isOpen.set(!result.matches));
  }

  deleteChat(chatId: string) {
    this.chatService.delete(chatId)
      .pipe(
        first(),
        switchMap(() => this.actions.loadChats()),
        tap(() => {
          if(this.selectors.selectedChat()?.id == chatId) this.router.navigate(['/'])
        })
      ).subscribe();
  }
}
