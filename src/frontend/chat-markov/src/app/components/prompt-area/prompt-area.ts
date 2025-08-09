import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, Component, computed, ElementRef, inject, Injector, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { createDispatchMap, createSelectMap } from '@ngxs/store';
import { skip, tap } from 'rxjs';
import { MainActions } from '../../states/main/main.actions';
import { MainState } from '../../states/main/main.state';

@Component({
  selector: 'app-prompt-area',
  imports: [NgTemplateOutlet],
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
  readonly promptInput = viewChild<ElementRef<HTMLDivElement>>('input');
  readonly fileSelected = signal<File | null>(null);
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly showSingleLineInput = signal<boolean>(true);
  readonly injector = inject(Injector);

  constructor() {
    toObservable(this.selectors.selectedChat).pipe(
      tap(() => {
        this.promptText.set(null)
        if (this.promptInput()) {
          this.promptInput()!.nativeElement.textContent = null;
          setTimeout(() => this.promptInput()!.nativeElement.blur());
        }
        this.clearFileSelected();
        this.showSingleLineInput.set(true);
      }),
      takeUntilDestroyed()
    ).subscribe();

    toObservable(this.showSingleLineInput)
      .pipe(
        skip(1),
        tap(() => afterNextRender({
          write: () => {
            this.promptInput()!.nativeElement.innerHTML = this.promptText() ?? '';
            this.promptInput()!.nativeElement.focus();
            this.moveCaretToEnd(this.promptInput()!.nativeElement);
          }
        }, { injector: this.injector })),
        takeUntilDestroyed()
      ).subscribe();
  }

  onKeyDown(event: KeyboardEvent) {
    const input = event.target as HTMLElement;
    const maxChars = 50;
    const textLength = input.innerText.length;

    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Control', 'Meta', 'Shift', 'Alt', 'Tab', 'Enter'
    ];

    if (textLength >= maxChars && !allowedKeys.includes(event.key) && this.newChat()) {
      event.preventDefault();
      return;
    }

    if (event.key === 'Enter') {
      if (!event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        this.sendPrompt();
      } else if (this.newChat()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  onInput(input: HTMLDivElement) {
    this.promptText.set(input.textContent);
    if (!this.newChat()) {
      if (!this.promptText()?.trim().length) {
        this.showSingleLineInput.set(true);
      }
      else if (this.promptText()?.includes('\n')) {
        this.showSingleLineInput.set(false);
      }
      else if (input.scrollWidth > input.clientWidth) {
        this.showSingleLineInput.set(false);
      }
    }
  }

  moveCaretToEnd(el: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false); // false = final
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  sendPrompt() {
    if (!this.valid()) return;

    this.send.emit([this.promptInput()!.nativeElement.textContent!, this.fileSelected()]);
    this.promptText.set(null);
    this.promptInput()!.nativeElement.textContent = null;
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
