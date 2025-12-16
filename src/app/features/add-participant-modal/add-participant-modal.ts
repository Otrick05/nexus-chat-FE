import { Component, inject, signal, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { GroupService } from '../../core/services/group.service';
import { Contacto } from '../../core/models/contacto.models';
import { AvatarUrlPipe } from '../../shared/pipes/avatar-url.pipe';

@Component({
    selector: 'app-add-participant-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, AvatarUrlPipe],
    templateUrl: './add-participant-modal.html',
    styleUrl: './add-participant-modal.scss'
})
export class AddParticipantModal implements OnInit {
    private contactService = inject(ContactService);
    private groupService = inject(GroupService);

    chatId = input.required<number>();

    close = output<void>();
    participantAdded = output<void>();

    // State
    viewMode = signal<'ADD' | 'REMOVE'>('ADD');
    contacts = signal<Contacto[]>([]); // Reused for both lists
    selectedContactEmail = signal<string | null>(null);
    isSaving = signal(false);
    errorMessage = signal('');

    ngOnInit() {
        this.loadData();
    }

    setViewMode(mode: 'ADD' | 'REMOVE') {
        if (this.viewMode() === mode) return;
        this.viewMode.set(mode);
        this.selectedContactEmail.set(null);
        this.errorMessage.set('');
        this.loadData();
    }

    loadData() {
        if (this.viewMode() === 'ADD') {
            this.contactService.getContacts().subscribe({
                next: (data) => this.contacts.set(data),
                error: (err) => {
                    console.error('Error loading contacts', err);
                    this.errorMessage.set('No se pudieron cargar los contactos');
                }
            });
        } else {
            this.groupService.getGroupParticipants(this.chatId()).subscribe({
                next: (data) => {
                    const mapped: Contacto[] = data.map(item => ({
                        correo: item.correo,
                        nombreUsuario: item.nombreUsuario,
                        avatarUrl: item.avatarUrl,
                        nombreAppUsuario: item.nombreAppUsuario,
                        relacion: 'FRIEND'
                    }));
                    this.contacts.set(mapped);
                },
                error: (err) => {
                    console.error('Error loading participants', err);
                    this.errorMessage.set('No se pudieron cargar los participantes');
                }
            });
        }
    }

    selectContact(email: string) {
        if (this.selectedContactEmail() === email) {
            this.selectedContactEmail.set(null);
        } else {
            this.selectedContactEmail.set(email);
        }
    }

    onConfirm() {
        const email = this.selectedContactEmail();
        if (!email) return;

        this.isSaving.set(true);
        this.errorMessage.set('');

        const action$ = this.viewMode() === 'ADD'
            ? this.groupService.addParticipant(this.chatId(), email)
            : this.groupService.removeParticipant(this.chatId(), email);

        action$.subscribe({
            next: () => {
                this.isSaving.set(false);
                this.participantAdded.emit();
                // Don't close immediately if we want to allow multiple? User didn't specify.
                // But typically modals close.
                this.close.emit();
            },
            error: (err) => {
                console.error('Error in action', err);
                this.isSaving.set(false);
                this.errorMessage.set('Error en la operación. Inténtalo de nuevo.');
            }
        });
    }

    onClose() {
        this.close.emit();
    }
}
