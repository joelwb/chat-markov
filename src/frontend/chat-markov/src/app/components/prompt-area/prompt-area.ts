import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { createDispatchMap, createSelectMap } from '@ngxs/store';
import { tap } from 'rxjs';
import { MainActions } from '../../states/main/main.actions';
import { MainState } from '../../states/main/main.state';

@Component({
  selector: 'app-prompt-area',
  imports: [],
  standalone: true,
  templateUrl: './prompt-area.html',
  styleUrl: './prompt-area.scss'
})
export class PromptArea {
  readonly selectors = createSelectMap({
    selectedChat: MainState.selectedChat,
    isTrainingSelectedChat: MainState.isTrainingSelectedChat,
    trainingProgress: MainState.trainingProgressOfSelectedChat,
    isGeneratingTextForSelectedChat: MainState.isGeneratingTextForSelectedChat
  })

  readonly actions = createDispatchMap({
    setTrainingProgress: MainActions.SetTrainingProgress,
    removeChatFromGeneratingText: MainActions.RemoveChatFromGeneratingText
  })

  readonly newChat = computed(() => !this.selectors.selectedChat());
  readonly canType = computed(() => !this.selectors.isGeneratingTextForSelectedChat() && !this.selectors.isTrainingSelectedChat());
  readonly valid = computed(() => {
    if (this.newChat()) {
       return this.promptText() && this.fileSelected()
    }

    return this.promptText() || this.fileSelected();
  })

  readonly promptText = signal<string | null>(null);
  readonly send = output<[string, File | null]>();
  readonly promptInput = viewChild.required<ElementRef<HTMLDivElement>>('input');
  readonly fileSelected = signal<File | null>(null);
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);


  constructor() {
    toObservable(this.selectors.selectedChat).pipe(
      tap(() => {
        this.promptText.set(null)
        this.promptInput().nativeElement.textContent = null;
        this.clearFileSelected();
      }),
      takeUntilDestroyed()
    ).subscribe();
  }

  sendPrompt() {
    if (!this.valid()) return;

    this.send.emit([this.promptInput().nativeElement.textContent!, this.fileSelected()]);
    this.promptText.set(null);
    this.promptInput().nativeElement.textContent = null;
    this.clearFileSelected();
  }

  clearFileSelected() {
    this.fileSelected.set(null);
    const input = this.elementRef.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    input.value = '';
  }

  cancelTextGeneration() {
    this.actions.removeChatFromGeneratingText(this.selectors.selectedChat()!);
  }
}
