import { Component, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { ChatService } from '../../core/services/chat.service';
import { Contacto } from '../../core/models/contacto.models';
import { AvatarUrlPipe } from '../../shared/pipes/avatar-url.pipe';

@Component({
    selector: 'app-create-group-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, AvatarUrlPipe],
    templateUrl: './create-group-modal.html',
    styleUrl: './create-group-modal.scss'
})
export class CreateGroupModal implements OnInit {
    private contactService = inject(ContactService);
    private chatService = inject(ChatService);

    close = output<void>();
    groupCreated = output<void>();

    // State
    groupName = signal('');
    contacts = signal<Contacto[]>([]);
    selectedContacts = signal<Set<string>>(new Set());
    isCreating = signal(false);
    errorMessage = signal('');

    ngOnInit() {
        this.loadContacts();
    }

    loadContacts() {
        this.contactService.getContacts().subscribe({
            next: (data) => this.contacts.set(data),
            error: (err) => {
                console.error('Error loading contacts', err);
                this.errorMessage.set('No se pudieron cargar los contactos');
            }
        });
    }

    toggleContact(email: string) {
        const current = new Set(this.selectedContacts());
        if (current.has(email)) {
            current.delete(email);
        } else {
            current.add(email);
        }
        this.selectedContacts.set(current);
    }

    canCreate(): boolean {
        return this.groupName().trim().length > 0 && this.selectedContacts().size > 0;
    }

    onCreate() {
        if (!this.canCreate()) return;

        this.isCreating.set(true);
        this.errorMessage.set('');

        const groupName = this.groupName();
        const participants = Array.from(this.selectedContacts());

        console.log('Enviando solicitud de crear curso:', { groupName, participants });

        this.chatService.createGroup(groupName, participants).subscribe({
            next: () => {
                this.isCreating.set(false);
                this.groupCreated.emit();
                this.close.emit();
            },
            error: (err) => {
                console.error('Error creating group', err);
                this.isCreating.set(false);
                this.errorMessage.set('Error al crear el grupo. Inténtalo de nuevo.');
            }
        });
    }

    onClose() {
        this.close.emit();
    }
}
