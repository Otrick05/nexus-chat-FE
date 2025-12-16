import { Component, EventEmitter, Output, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/login-request.models';
import { SignupRequest } from '../../core/models/signup-request.model';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-modal.html',
  styleUrl: './login-modal.scss'
})
export class LoginModal {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  // --- Estado del Componente ---
  public isRegisterView = signal(false);

  // Feedback Signals
  public errorMessage = signal<string | null>(null);
  public successMessage = signal<string | null>(null);
  public isSaving = signal(false);

  @Input() appVersion: string = '';

  @Output() close = new EventEmitter<void>();

  // --- Formularios ---
  public loginForm = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  public registerForm = this.fb.nonNullable.group({
    nombreUsuario: ['', [
      Validators.required,
      (control: AbstractControl) => {
        const value = control.value;
        if (!value) return null; // Let required handle empty
        // Check for at least two words
        const parts = value.trim().split(/\s+/);
        if (parts.length < 2) {
          return { oneWord: true };
        }
        return null; // Valid (2+ words)
      }
    ]],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // --- Métodos ---

  public onNameInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const newValue = input.value.replace(/[0-9]/g, '');

    if (input.value !== newValue) {
      input.value = newValue;
      this.registerForm.controls.nombreUsuario.setValue(newValue);
    }
  }

  public closeModal() {
    this.close.emit();
    // Reset state on close
    this.resetState();
  }

  public toggleView() {
    this.isRegisterView.update(v => !v);
    this.resetState();
  }

  private resetState() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSaving.set(false);
    this.loginForm.reset();
    this.registerForm.reset();
    this.loginForm.enable();
    this.registerForm.enable();
  }

  public onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.startLoading();

    const payload = this.loginForm.getRawValue() as LoginRequest;

    this.authService.login(payload).subscribe({
      next: (success) => {
        if (success) {
          this.handleSuccess('Inicio de sesión exitoso', () => {
            this.close.emit();
          });
        } else {
          this.stopLoading();
          this.errorMessage.set('Email o contraseña incorrectos.');
        }
      },
      error: (err) => {
        this.stopLoading();
        console.error('Login error:', err);
        this.errorMessage.set(err.error?.message || 'Error inesperado al iniciar sesión.');
      }
    });
  }

  public onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.startLoading();

    const payload = this.registerForm.getRawValue() as SignupRequest;

    this.authService.register(payload).subscribe({
      next: (success) => {
        if (success) {
          // Auto-login success
          this.handleSuccess('Registro exitoso', () => {
            this.close.emit();
          });
        } else {
          this.stopLoading();
          this.errorMessage.set('Error al registrar. El email quizás ya existe.');
        }
      },
      error: (err) => {
        this.stopLoading();
        console.error('Register error:', err);
        this.errorMessage.set(err.error?.message || 'Error de conexión.');
      }
    });
  }

  // Helpers
  private startLoading() {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loginForm.disable();
    this.registerForm.disable();
  }

  private stopLoading() {
    this.isSaving.set(false);
    this.loginForm.enable();
    this.registerForm.enable();
  }

  private handleSuccess(message: string, callback: () => void) {
    this.isSaving.set(false);
    this.successMessage.set(message);
    // Keep forms disabled during success message

    setTimeout(() => {
      callback();
    }, 1500);
  }



  public onModalClick(event: MouseEvent) {
    event.stopPropagation();
  }
}
