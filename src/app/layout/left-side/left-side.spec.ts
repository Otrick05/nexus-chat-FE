import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftSide } from './left-side';

describe('LeftSide', () => {
  let component: LeftSide;
  let fixture: ComponentFixture<LeftSide>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftSide]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeftSide);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
