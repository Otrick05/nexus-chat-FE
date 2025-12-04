import { HttpClient } from '@angular/common/http';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-body',
  imports: [CommonModule],
  templateUrl: './chat-body.html',
  styleUrl: './chat-body.scss'
})
export class ChatBody implements OnInit {
  @Input() chatId: string = '';

  mensajes = signal<any[]>([]);
  private http = inject(HttpClient);



  ngOnInit() {
    this.fetchMessages();

    this.subscribeToSocket();
  }

fetchMessages() {
    console.log(`List: Fetching history for ${this.chatId}`);
    // Mock Data idéntico al HTML original
    const mockData = [
      { id: 1, sender: 'John', text: "Hey everyone! How's it going?", time: '10:00 AM', isOwn: false, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdzv4Cl185YoDf73mg4Q4ByezJ_s9D43M5QR9WzWoDQv7LTkh2eXZwoOAffrcuJjsFfUQeM79iw-n92sZkSIbMqCxhwJvyupYhDmLkm6KzdCl3uHduNfRnGndxxdfyOHV3fP4TPx9U-3Iu26JjEUoL8jHgNMrluCATLv7hGIJFU29diXgTYqH29cPpyM-LdvxJq3TPyJpHH7MNwCDLM5W47FzABZ95HS8ajiOv6RPqE85pV9VM5b-dOZpRFT6XnAjPmrONluggFTpe' },
      { id: 2, sender: 'Me', text: "Hi John! Doing great, thanks.", time: '10:01 AM', isOwn: true, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpq6r6Vti0qspJX0_WJTAoihOXeBwg4PI7V4fvcfjIkEDPu8eROz8YFgOQ5QJXzFG0O8D_aJ8kodKk1_rXQSBUTA6BRZiG8DZZ-GaayZTZ0mE0gnD-Q5jUzo59sKFIHkncljqT4DmYJQTYpfHFGkcWZEUu_jFPMEJkendz8vFltUKDzvW-t0o1TW6_y5CBPQJNc2oB7uVz4rL6gnT60hpOK07_ltydYcvfteoQkBW47SsENCuzEPStHg0WrLihPO5r3jXwB7CHVn3H' },
      { id: 3, sender: 'Alex', text: "Sounds exciting! Can't wait.", time: '10:02 AM', isOwn: false, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAw8v11gEXYm45mjA6EVA-Am5YiUm2UClDFipwkxAlKErXwRMdOcymNx0v08cqlV9bhJrgLLFF0yZjPpnsuMpMlfV2ZhxOF3icsR4p292JKJPmoMfVJDYpPaMGB2fWdPtmdeDZ--o-JhQUCtIwpRKV2aLj826SJ1z5GykqdIcDSFSNkxw6peZhWVuRHjN54CpPvasMIpYzjpFAF_ac6Cnb7-PfTON6MAmk0vqQudE6fOayUHI4Eq1B0U9qX0U3rh_8KuJGUwc1x_p-F' }
    ];

    this.mensajes.set(mockData);
  }

  subscribeToSocket() {
    // Simulación de mensaje entrante a los 5 segundos
    setTimeout(() => {
        this.mensajes.update(msgs => [...msgs, {
            id: 4, sender: 'System', text: 'New user joined (Real-time simulation)', time: '10:05 AM', isOwn: false, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFtl72zdxR7vws40F8PSvkhcQ0qkgaSVQ5zGl7HA2GI9c07fxo70pOa6mbAWRz9GVDGa5SCgBXi7T_Kwvl13HJYpROvw55iz_R3DeCdT6EcE7y9s6V3BeI4iJS0DbYtzxCqMc-zrtsJrye49yXB_EiUWo93a73lm5SQtYbwPvEE2HNxu8ITy38A4S0gnkGVJdq5213cZQBeHIUxUawd8OP8QmpFC5CE6HGu0bSYdmdhAQDnUv1ENf_DNnODqLY2Tew8DWwtyL_t-pC'
        }]);
    }, 5000);
  }

}
