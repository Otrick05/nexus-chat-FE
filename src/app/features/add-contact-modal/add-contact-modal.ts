import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ContactService } from '../../core/services/contact.service';
import { Contacto } from '../../core/models/contacto.models';
import { AvatarUrlPipe } from '../../shared/pipes/avatar-url.pipe';

@Component({
  selector: 'app-add-contact-modal',
  imports: [CommonModule, FormsModule, AvatarUrlPipe],
  templateUrl: './add-contact-modal.html',
  styleUrl: './add-contact-modal.scss'
})
export class AddContactModal {
  private authService = inject(AuthService);
  private contactService = inject(ContactService);

  public close = output<void>();
  public contactAdded = output<void>();

  public searchEmail = signal('');
  public foundContact = signal<Contacto | null>(null);
  public errorMessage = signal<string | null>(null);
  public isSearching = signal(false);

  // Search logic
  public onSearch() {
    const email = this.searchEmail().trim();
    if (!email) return;

    // Email validation regex (basic)
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      this.errorMessage.set('Por favor, introduce un correo electrónico válido.');
      return;
    }

    this.isSearching.set(true);
    this.errorMessage.set(null);
    this.foundContact.set(null);

    this.authService.fetchUserProfile(email).subscribe({
      next: (user) => {
        this.isSearching.set(false);
        if (user) {
          this.foundContact.set({
            correo: user.correo,
            nombreAppUsuario: user.nombreAppUsuario,
            nombreUsuario: user.nombreUsuario,
            avatarUrl: user.avatarUrl
          });
        } else {
          this.errorMessage.set('Usuario no encontrado');
        }
      },
      error: () => {
        this.isSearching.set(false);
        this.errorMessage.set('Error al buscar usuario');
      }
    });
  }

  public onAdd() {
    const contact = this.foundContact();
    if (!contact) return;

    this.contactService.addContact(contact.correo).subscribe({
      next: () => {
        this.contactAdded.emit();
        this.close.emit();
      },
      error: (err) => {
        console.error('Error adding contact', err);
        const backendMsg = err.error?.message;
        if (backendMsg) {
          this.errorMessage.set(backendMsg);
        } else {
          this.errorMessage.set('Error al agregar contacto.');
        }
      }
    });
  }

  public onClear() {
    this.searchEmail.set('');
    this.foundContact.set(null);
    this.errorMessage.set(null);
  }

  public onClose() {
    this.close.emit();
  }
}
