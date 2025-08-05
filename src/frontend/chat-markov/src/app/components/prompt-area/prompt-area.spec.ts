import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromptArea } from './prompt-area';

describe('PromptArea', () => {
  let component: PromptArea;
  let fixture: ComponentFixture<PromptArea>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromptArea]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PromptArea);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
