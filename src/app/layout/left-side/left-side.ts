import { CommonModule } from '@angular/common';
import { Component, inject, signal, effect, afterNextRender, computed } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { ChatService } from '../../core/services/chat.service';
import { ChatStateService } from '../../core/services/chat.state'; // Import State
import { LoginModal } from "../../features/login-modal/login-modal";
import { AddContactModal } from '../../features/add-contact-modal/add-contact-modal';
import { AuthService } from '../../core/services/auth.service';
import { AvatarUrlPipe } from '../../shared/pipes/avatar-url.pipe';
import { Contacto } from '../../core/models/contacto.models';
import { Chat, ChatListResponseDTO } from '../../core/models/chat.models';
import packageInfo from '../../../../package.json';
import { ChangeNameModal } from '../../features/change-name-modal/change-name-modal';
import { ChangePasswordModal } from '../../features/change-password-modal/change-password-modal';
import { CreateGroupModal } from '../../features/create-group-modal/create-group-modal';

@Component({
  selector: 'app-left-side',
  imports: [CommonModule, LoginModal, AddContactModal, AvatarUrlPipe, ReactiveFormsModule, ChangeNameModal, ChangePasswordModal, CreateGroupModal],
  templateUrl: './left-side.html',
  styleUrl: './left-side.scss'
})
export class LeftSide {

  private authService = inject(AuthService);
  private contactService = inject(ContactService);
  private chatService = inject(ChatService);
  private chatState = inject(ChatStateService); // Inject State
  private readyToFetch = signal(false);
  public appVersion: string = packageInfo.version;
  public activeView: 'chats' | 'contacts' | 'settings' = 'chats';

  public isLoginModalVisible = signal(false);
  public isAddContactModalVisible = signal(false);
  public isChangeNameModalVisible = signal(false);
  public isChangePasswordModalVisible = signal(false);
  public isCreateGroupModalVisible = signal(false);

  public currentUser = this.authService.currentUser;

  public userStatus = signal<'Online' | 'Busy' | 'Offline'>('Online');
  public showLogoutConfirm = signal(false);


  // Signal for contacts list
  public contactsList = computed(() => {
    const contacts = this.contactService.contacts();
    return [...contacts].sort((a, b) => {
      const nameA = (a.nombreAppUsuario || a.nombreUsuario || a.correo || '').toLowerCase();
      const nameB = (b.nombreAppUsuario || b.nombreUsuario || b.correo || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });

  // Use State for chats
  public chatsList = this.chatState.chats;

  // Fallback data for preview/guest mode (Chat Demo)
  public demoChats = [
    { id: 1, name: 'Global Chat', lastMessage: 'Suena emocionante...', time: '10:02 AM', unread: 0 },
    { id: 2, name: 'Diseño UX/UI', lastMessage: '¿Qué opinan del nuevo logo?', time: 'Ayer', unread: 2 },
    { id: 3, name: 'Alex', lastMessage: '¡Claro, te veo luego!', time: 'Ayer', unread: 0 },
  ];

  // Fallback data for preview/guest mode (Contacts Demo)
  public demoContacts = [
    { id: 1, name: 'John', status: 'Online' },
    { id: 2, name: 'Alex', status: 'Online' },
    { id: 3, name: 'Sarah', status: 'Offline' },
    { id: 4, name: 'Mike', status: 'Ausente' },
  ];

  constructor() {
    afterNextRender(() => {
      this.readyToFetch.set(true);
    });

    // Load contacts and chats when user logs in and app is hydrated
    effect(() => {
      if (this.currentUser() && this.readyToFetch()) {
        this.contactService.loadContacts();
        this.loadChats();
      } else if (!this.currentUser()) {
        // Clear contacts state on logout (optional, service might handle it or we do it here)
        // this.contactService.contacts.set([]); // Access denied to protected field? No, it's public.
      }
    });
  }

  // 3. Método para cambiar la vista
  setView(view: 'chats' | 'contacts' | 'settings') {
    this.activeView = view;

  }

  public openLoginModal() {
    this.isLoginModalVisible.set(true);
  }

  public closeLoginModal() {
    this.isLoginModalVisible.set(false);
  }

  public toggleUserStatus() {
    const current = this.userStatus();
    if (current === 'Online') {
      this.userStatus.set('Busy');
    } else if (current === 'Busy') {
      this.userStatus.set('Offline');
    } else {
      this.userStatus.set('Online');
    }
  }


  public onLogout() {
    this.showLogoutConfirm.set(true);
  }

  public confirmLogout() {
    this.authService.logout();
    this.showLogoutConfirm.set(false);
    this.userStatus.set('Online'); // Reset status on logout
    this.setView('chats'); // Reset view
  }

  public cancelLogout() {
    this.showLogoutConfirm.set(false);
  }

  // Removed local loadContacts as it is handled by service
  /*
  public loadContacts() {
    this.contactService.getContacts().subscribe({
      next: (contacts) => {
        this.contactsList.set(contacts);
      },
      error: (err) => console.error('Error loading contacts:', err)
    });
  }
  */

  public loadChats() {
    // Just trigger the fetch; state updates automatically
    this.chatService.getChats().subscribe({
      error: (err) => console.error('Error loading chats:', err)
    });
  }

  public openAddContactModal() {
    this.isAddContactModalVisible.set(true);
  }

  public closeAddContactModal() {
    this.isAddContactModalVisible.set(false);
  }

  public onContactAdded() {
    this.contactService.loadContacts(); // Refresh list via service
  }

  public onSelectContact(contact: Contacto) {
    this.chatService.startChatWithContact(contact);
    // Switch view back to chats so user sees the new provisional chat
    this.setView('chats');
  }

  public onSelectChat(chat: Chat) {
    this.chatService.openChat(chat.id);
  }

  // Settings Modals
  public openChangeNameModal() {
    this.isChangeNameModalVisible.set(true);
  }

  public closeChangeNameModal() {
    this.isChangeNameModalVisible.set(false);
  }

  public openChangePasswordModal() {
    this.isChangePasswordModalVisible.set(true);
  }

  public closeChangePasswordModal() {
    this.isChangePasswordModalVisible.set(false);
  }

  // Create Group Modal
  public openCreateGroupModal() {
    this.isCreateGroupModalVisible.set(true);
  }

  public closeCreateGroupModal() {
    this.isCreateGroupModalVisible.set(false);
  }

  public onGroupCreated() {
    this.loadChats(); // Refresh chats
    this.setView('chats');
  }
}
