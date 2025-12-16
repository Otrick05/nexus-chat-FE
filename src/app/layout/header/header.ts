import { CommonModule } from '@angular/common';
import { Component, DOCUMENT, Inject, Renderer2, inject } from '@angular/core';
import { ChatStateService } from '../../core/services/chat.state';
import { AvatarUrlPipe } from '../../shared/pipes/avatar-url.pipe';

import { ChatUserActions } from '../../features/chat/chat-user-actions/chat-user-actions';

@Component({
  selector: 'app-header',
  imports: [CommonModule, AvatarUrlPipe, ChatUserActions],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);
  private chatState = inject(ChatStateService);

  public activeChat = this.chatState.activeChat;
  public isDark = false;

  toggleTheme() {
    this.isDark = !this.isDark;
    this.document.body.classList.toggle('dark');
    if (this.document.documentElement.classList.contains('dark')) {
      this.renderer.removeClass(this.document.documentElement, 'dark');
    } else {
      this.renderer.addClass(this.document.documentElement, 'dark');
    }
  }
}
