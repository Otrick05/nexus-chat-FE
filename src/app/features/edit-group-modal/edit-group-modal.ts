import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../core/services/group.service';

@Component({
    selector: 'app-edit-group-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './edit-group-modal.html',
    styleUrl: './edit-group-modal.scss'
})
export class EditGroupModal {
    private groupService = inject(GroupService);

    chatId = input.required<number>();
    currentName = input.required<string>(); // Initial name

    close = output<void>();
    chatUpdated = output<void>();

    // State
    groupName = signal('');
    isSaving = signal(false);
    errorMessage = signal('');

    ngOnInit() {
        this.groupName.set(this.currentName());
    }

    onSave() {
        if (!this.groupName().trim()) return;

        this.isSaving.set(true);
        this.errorMessage.set('');

        this.groupService.updateChatDetails(this.chatId(), { nombre: this.groupName() }).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.chatUpdated.emit();
                this.close.emit();
            },
            error: (err) => {
                console.error('Error updating group', err);
                this.isSaving.set(false);
                this.errorMessage.set('Error al actualizar el chat.');
            }
        });
    }

    onClose() {
        this.close.emit();
    }
}
