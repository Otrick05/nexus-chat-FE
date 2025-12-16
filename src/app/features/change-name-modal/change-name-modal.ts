import { Component, inject, signal, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-change-name-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './change-name-modal.html',
    styleUrl: './change-name-modal.scss'
})
export class ChangeNameModal {
    private authService = inject(AuthService);

    public close = output<void>();

    public newName = signal('');
    public isSaving = signal(false);
    public errorMessage = signal<string | null>(null);
    public successMessage = signal<string | null>(null);

    public isValid = computed(() => {
        return this.newName().trim().length >= 3;
    });

    onSave() {
        if (!this.isValid()) return;
        const name = this.newName().trim();

        this.isSaving.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        this.authService.updateDisplayName(name).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.successMessage.set('Nombre actualizado correctamente');
                setTimeout(() => {
                    this.close.emit();
                }, 1500);
            },
            error: (err) => {
                this.isSaving.set(false);
                console.error('Error updating name:', err);
                // Assuming backend may send message in err.error.message or err.message
                this.errorMessage.set(err.error?.message || 'Error al actualizar el nombre');
            }
        });
    }

    onClose() {
        this.close.emit();
    }
}
