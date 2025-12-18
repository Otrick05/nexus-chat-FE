import { Component, inject, Input, OnInit, signal, computed, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ChatStateService } from '../../../core/services/chat.state';
import { TipoMensaje } from '../../../core/models/chat.models';
import { AvatarUrlPipe } from '../../../shared/pipes/avatar-url.pipe';

@Component({
  selector: 'app-chat-body',
  imports: [CommonModule, AvatarUrlPipe],
  templateUrl: './chat-body.html',
  styleUrl: './chat-body.scss'
})
export class ChatBody implements OnInit {
  @Input() chatId: string = '';

  private authService = inject(AuthService);
  private chatState = inject(ChatStateService);
  private el = inject(ElementRef); // For scrolling

  private prevLength = 0;

  // Computed signal for messages:
  // If user is null -> Show demo/mock messages.
  // If user is logged in -> Show real activeMessages from state.
  mensajes = computed(() => {
    const user = this.authService.currentUser();
    if (!user) {
      //mockos
      return this.demoMessages().map(m => ({
        ...m,
        type: TipoMensaje.TEXT, // Mock messages are text
        senderObj: {
          // Mock data has 'avatar' property with URL
          urlAvatar: m.avatar,
          nombreUsuario: m.sender
        }
      }));
    } else {

      const realMsgs = this.chatState.activeMessages();
      const currentEmail = user.correo;

      return realMsgs.map((m: any) => {
        const type = m.tipoMensaje || TipoMensaje.TEXT;
        if (type === TipoMensaje.IMAGE) {
          console.log(`DEBUG: ChatBody Computed - Msg ID ${m.id}. Content (Src):`, m.contenido);
        }

        return {
          id: m.id,
          isOwn: m.correoRemitente === currentEmail,

          senderObj: {
            nombreUsuario: m.remitenteNombre,
            urlAvatar: m.remitenteAvatar,
            correo: m.correoRemitente
          },
          sender: m.remitenteNombre || m.correoRemitente,
          text: m.contenido,
          type: type,
          time: this.formatTime(m.timestamp)
        };
      });
    }
  });

  TipoMensaje = TipoMensaje; // Expose enum to template


  private demoMessages = signal<any[]>([]);

  constructor() {
    effect(() => {
      const msgs = this.mensajes();
      const currentLength = msgs.length;
      const lastMsg = msgs[currentLength - 1];

      // "Smart Scroll": Only scroll if:
      // 1. We loaded a chunk of messages (initial load or page load) -> diff > 1
      // 2. We just sent a message (isOwn)
      // 3. Or it's the very first load (prevLength == 0)

      if (currentLength > this.prevLength) {
        const isMultiple = (currentLength - this.prevLength) > 1;
        const isOwn = lastMsg?.isOwn;

        if (isMultiple || isOwn || this.prevLength === 0) {
          this.scrollToBottom();
        }
      }
      this.prevLength = currentLength;
    });
  }

  ngOnInit() {
    // Determine initial state logic
    // We don't need to manually fetch if we use computed,
    // but we do need to populate demoMessages if we are in demo mode.
    if (!this.authService.currentUser()) {
      this.fetchMessages();
    }
  }

  scrollToBottom() {
    try {
      setTimeout(() => {
        this.el.nativeElement.scrollTop = this.el.nativeElement.scrollHeight;
      }, 50); // Small delay to ensure rendering
    } catch (err) { }
  }

  fetchMessages() {
    console.log(`List: Fetching history for ${this.chatId}`);
    // Mock Data idéntico al HTML original
    const mockData = [
      { id: 1, sender: 'John', text: "Hey everyone! How's it going?", time: '10:00 AM', isOwn: false, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdzv4Cl185YoDf73mg4Q4ByezJ_s9D43M5QR9WzWoDQv7LTkh2eXZwoOAffrcuJjsFfUQeM79iw-n92sZkSIbMqCxhwJvyupYhDmLkm6KzdCl3uHduNfRnGndxxdfyOHV3fP4TPx9U-3Iu26JjEUoL8jHgNMrluCATLv7hGIJFU29diXgTYqH29cPpyM-LdvxJq3TPyJpHH7MNwCDLM5W47FzABZ95HS8ajiOv6RPqE85pV9VM5b-dOZpRFT6XnAjPmrONluggFTpe' },
      { id: 2, sender: 'Me', text: "Hi John! Doing great, thanks.", time: '10:01 AM', isOwn: true, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpq6r6Vti0qspJX0_WJTAoihOXeBwg4PI7V4fvcfjIkEDPu8eROz8YFgOQ5QJXzFG0O8D_aJ8kodKk1_rXQSBUTA6BRZiG8DZZ-GaayZTZ0mE0gnD-Q5jUzo59sKFIHkncljqT4DmYJQTYpfHFGkcWZEUu_jFPMEJkendz8vFltUKDzvW-t0o1TW6_y5CBPQJNc2oB7uVz4rL6gnT60hpOK07_ltydYcvfteoQkBW47SsENCuzEPStHg0WrLihPO5r3jXwB7CHVn3H' },
      { id: 3, sender: 'Alex', text: "Sounds exciting! Can't wait.", time: '10:02 AM', isOwn: false, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAw8v11gEXYm45mjA6EVA-Am5YiUm2UClDFipwkxAlKErXwRMdOcymNx0v08cqlV9bhJrgLLFF0yZjPpnsuMpMlfV2ZhxOF3icsR4p292JKJPmoMfVJDYpPaMGB2fWdPtmdeDZ--o-JhQUCtIwpRKV2aLj826SJ1z5GykqdIcDSFSNkxw6peZhWVuRHjN54CpPvasMIpYzjpFAF_ac6Cnb7-PfTON6MAmk0vqQudE6fOayUHI4Eq1B0U9qX0U3rh_8KuJGUwc1x_p-F' }
    ];
    this.demoMessages.set(mockData);
  }


  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  openMedia(url: string, type: string) {
    window.open(url, '_blank');
  }
}
