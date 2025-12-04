import { CommonModule } from '@angular/common';
import { Component, inject, signal, effect, afterNextRender } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { LoginModal } from "../../features/login-modal/login-modal";
import { AuthService } from '../../core/services/auth.service';
import { AvatarUrlPipe } from '../../shared/pipes/avatar-url.pipe';
import { Contact } from '../../core/models/contact.models';

@Component({
  selector: 'app-left-side',
  imports: [CommonModule, LoginModal, AvatarUrlPipe, ReactiveFormsModule],
  templateUrl: './left-side.html',
  styleUrl: './left-side.scss'
})
export class LeftSide {

  private authService = inject(AuthService);
  private contactService = inject(ContactService);
  private readyToFetch = signal(false);

  public activeView: 'chats' | 'contacts' | 'settings' = 'chats';
  public isLoginModalVisible = signal(false);
  public currentUser = this.authService.currentUser;

  public userStatus = signal<'Online' | 'Busy' | 'Offline'>('Online');
  public showLogoutConfirm = signal(false);

  // Form control for adding contacts
  public newContactEmail = new FormControl('', [Validators.required, Validators.email]);

  // Signal for contacts list
  public contactsList = signal<Contact[]>([]);

  // 2. Datos de ejemplo (luego vendrán de un servicio)
  public chats = [
    { id: 1, name: 'Global Chat', lastMessage: 'Suena emocionante...', time: '10:02 AM', unread: 0 },
    { id: 2, name: 'Diseño UX/UI', lastMessage: '¿Qué opinan del nuevo logo?', time: 'Ayer', unread: 2 },
    { id: 3, name: 'Alex', lastMessage: '¡Claro, te veo luego!', time: 'Ayer', unread: 0 },
  ];

  // Fallback data for preview/guest mode
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

    // Load contacts when user logs in and app is hydrated
    effect(() => {
      if (this.currentUser() && this.readyToFetch()) {
        this.loadContacts();
      } else if (!this.currentUser()) {
        this.contactsList.set([]); // Clear contacts on logout
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
  }

  public cancelLogout() {
    this.showLogoutConfirm.set(false);
  }

  public loadContacts() {
    this.contactService.getContacts().subscribe({
      next: (contacts) => {
        this.contactsList.set(contacts);
      },
      error: (err) => console.error('Error loading contacts:', err)
    });
  }

  public onAddContact() {
    if (this.newContactEmail.invalid || !this.newContactEmail.value) return;

    const email = this.newContactEmail.value;
    this.contactService.addContact(email).subscribe({
      next: () => {
        this.newContactEmail.reset();
        this.loadContacts(); // Refresh list
      },
      error: (err) => console.error('Error adding contact:', err)
    });
  }
}
