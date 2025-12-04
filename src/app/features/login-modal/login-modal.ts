import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
// Asegúrate de que tus interfaces coincidan con las claves del form ('correo' vs 'email')
// Si LoginRequest usa 'email', necesitarás mapearlo manualmente.
// Asumiré aquí que tus interfaces usan 'correo' como en tu form.
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
  public errorMessage = signal<string | null>(null);

  // NUEVO: Señal para bloquear botones e inputs
  public isLoading = signal(false);

  @Output() close = new EventEmitter<void>();

  // --- Formularios ---
  public loginForm = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  public registerForm = this.fb.nonNullable.group({
    nombreUsuario: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // --- Métodos ---

  public closeModal() {
    this.close.emit();
  }

  public toggleView() {
    this.isRegisterView.update(v => !v);
    this.errorMessage.set(null);
    // Opcional: Limpiar formularios al cambiar de vista
    this.loginForm.reset();
    this.registerForm.reset();
  }

  public onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Muestra errores visuales
      return;
    }

    this.startLoading();

    // Casteo directo si las claves del form coinciden con la interfaz
    const payload = this.loginForm.getRawValue() as LoginRequest;

    this.authService.login(payload).subscribe({
      next: (success) => {
        this.stopLoading();
        if (success) {
          this.closeModal();
        } else {
          this.errorMessage.set('Email o contraseña incorrectos.');
        }
      },
      error: () => {
        // Fallback por si el catchError del servicio fallara (defensive programming)
        this.stopLoading();
        this.errorMessage.set('Error inesperado.');
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
        this.stopLoading();
        if (success) {
          // CAMBIO IMPORTANTE:
          // Como ya tenemos el JWT y el usuario logueado desde el servicio,
          // cerramos el modal directamente. Mejor experiencia de usuario (Auto-login).
          this.closeModal();
        } else {
          // Aquí el servicio devolvió false (capturado por catchError)
          this.errorMessage.set('Error al registrar. El email quizás ya existe.');
        }
      },
      error: () => {
        this.stopLoading();
        this.errorMessage.set('Error de conexión.');
      }
    });
  }

  // Helpers para reducir ruido visual
  private startLoading() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.loginForm.disable();
    this.registerForm.disable();
  }

  private stopLoading() {
    this.isLoading.set(false);
    this.loginForm.enable();
    this.registerForm.enable();
  }

  public onModalClick(event: MouseEvent) {
    event.stopPropagation();
  }
}
