import { CommonModule } from '@angular/common';
import { Component, DOCUMENT, Inject, Renderer2, inject, signal, computed, effect } from '@angular/core';
import { ChatStateService } from '../../core/services/chat.state';
import { AvatarUrlPipe } from '../../shared/pipes/avatar-url.pipe';

import { ChatUserActions } from '../../features/chat/chat-user-actions/chat-user-actions';
import { ContactService } from '../../core/services/contact.service';
import { AuthService } from '../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

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
  private contactService = inject(ContactService);
  private authService = inject(AuthService);

  // Use shared state
  public contacts = this.contactService.contacts;

  public isUnknownContact = computed(() => {
    const chat = this.activeChat();
    // Only for private chats
    if (!chat || chat.tipo !== 'PRIVADO') return false;

    // Attempt to identify the other participant's email
    let otherEmail = chat.contactEmail;
    const myEmail = this.authService.currentUser()?.correo;

    if (!otherEmail && chat.participantes?.length) {
      // Fallback: finding the email that is NOT the current user
      otherEmail = chat.participantes.find(p => p !== myEmail);
    }

    // Fallback: Try obtaining it from the last message if we are not the sender
    if (!otherEmail && chat.ultimoMensaje) {
      if (chat.ultimoMensaje.correoRemitente !== myEmail) {
        otherEmail = chat.ultimoMensaje.correoRemitente;
      }
    }

    // Guard: If I am the sender of the last message, I don't need to add them (prerequisite met)
    if (chat.ultimoMensaje && chat.ultimoMensaje.correoRemitente === myEmail) {
      return false;
    }

    // Check if in contacts
    // contactService.contacts() is Contacto[], need to find by email
    const isInContacts = this.contacts().some(c => c.correo === otherEmail);

    return !isInContacts;
  });

  public activeChat = this.chatState.activeChat;
  public isDark = false;

  constructor() {
    effect(() => {
      if (this.authService.currentUser()) {
        // We might not need to load here if LeftSide or app init does it, but to be safe:
        this.contactService.loadContacts();
      }
    });
  }


  // Removed local loadContacts
  /*
  loadContacts() {
    this.contactService.getContacts().subscribe({
      next: (contacts) => {
        const emails = new Set(contacts.map(c => c.correo));
        this.contacts.set(emails);
      },
      error: (err) => console.error('Error loading contacts in header', err)
    });
  }
  */

  async addContact() {
    const chat = this.activeChat();
    let emailToAdd = chat?.contactEmail;
    const myEmail = this.authService.currentUser()?.correo;

    if (!emailToAdd && chat?.participantes?.length) {
      emailToAdd = chat.participantes.find(p => p !== myEmail);
    }

    if (!emailToAdd && chat?.ultimoMensaje) {
      if (chat.ultimoMensaje.correoRemitente !== myEmail) {
        emailToAdd = chat.ultimoMensaje.correoRemitente;
      }
    }

    if (!emailToAdd) return;

    try {
      await firstValueFrom(this.contactService.addContact(emailToAdd));
      // Refresh happens strictly in service now
    } catch (error) {
      console.error('Error adding contact', error);
      // Optional: Show toast error
    }
  }

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
