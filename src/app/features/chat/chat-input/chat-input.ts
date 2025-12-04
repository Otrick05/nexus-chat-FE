import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input',
  imports: [FormsModule],
  templateUrl: './chat-input.html',
  styleUrl: './chat-input.scss'
})
export class ChatInput {

  messageText = '';
  private http = inject(HttpClient);

  sendMessage() {
    if (!this.messageText.trim()) return;

    // Lógica independiente de envío
    console.log('Input: Sending message via API...', this.messageText);

    // this.http.post('/api/messages', { text: this.messageText }).subscribe(...)

    this.messageText = ''; // Limpiar input
  }
}
