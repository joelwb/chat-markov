import { OverlayModule } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { dispatch, select } from '@ngxs/store';
import { MainActions } from '../../states/main/main.actions';
import { MainState } from '../../states/main/main.state';

@Component({
  selector: 'app-header',
  imports: [OverlayModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  readonly toogleSideBar = dispatch(MainActions.ToogleSideBar);
  readonly selectModelN = dispatch(MainActions.SelectModelN);

  readonly selectedChat = select(MainState.selectedChat);
  readonly selectedModelN = select(MainState.selectedModelN);

  readonly popoverOpen = signal<boolean>(false);
  readonly modelsNAvailable = new Array(14).fill(0).map((_, index) => index + 2);
}
