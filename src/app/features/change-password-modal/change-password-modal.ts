import { Component, inject, signal, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-change-password-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './change-password-modal.html',
    styleUrl: './change-password-modal.scss'
})
export class ChangePasswordModal {
    private authService = inject(AuthService);

    public close = output<void>();

    public currentPassword = signal('');
    public newPassword = signal('');
    public confirmPassword = signal('');

    public isSaving = signal(false);
    public errorMessage = signal<string | null>(null);
    public successMessage = signal<string | null>(null);

    // Computed validation
    public isLengthValid = computed(() => {
        return this.newPassword().length >= 7;
    });

    public isMatchValid = computed(() => {
        const pass = this.newPassword();
        const confirm = this.confirmPassword();
        return pass === confirm;
    });

    public isValid = computed(() => {
        return this.currentPassword().length > 0 &&
            this.isLengthValid() &&
            this.isMatchValid() &&
            this.confirmPassword().length > 0;
    });

    onSave() {
        if (!this.isValid()) {
            return;
        }

        this.isSaving.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        this.authService.updatePassword(this.currentPassword(), this.newPassword()).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.successMessage.set('Contraseña actualizada correctamente');

                // Clear fields on success as requested
                this.currentPassword.set('');
                this.newPassword.set('');
                this.confirmPassword.set('');

                setTimeout(() => {
                    this.close.emit();
                }, 1500);
            },
            error: (err) => {
                this.isSaving.set(false);
                console.error('Error updating password:', err);
                this.errorMessage.set(err.error?.message || 'Error al actualizar la contraseña');

                // Don't clear fields on error so user can retry
            }
        });
    }

    onClose() {
        this.close.emit();
    }
}
