import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';
import { ChatStateService } from '../../../core/services/chat.state';
import { UploadService } from '../../../core/services/upload.service';
import { TipoMensaje } from '../../../core/models/chat.models';

@Component({
  selector: 'app-chat-input',
  imports: [FormsModule],
  templateUrl: './chat-input.html',
  styleUrl: './chat-input.scss'
})
export class ChatInput {

  messageText = '';
  private chatService = inject(ChatService);
  private chatState = inject(ChatStateService);
  private uploadService = inject(UploadService);

  sendMessage() {
    if (!this.messageText.trim()) return;

    const activeChat = this.chatState.activeChat();
    if (!activeChat) return;

    const textToSend = this.messageText;
    this.messageText = ''; // Optimistic clear

    // Unified send (Service handles creation if ID is -1)
    this.chatService.sendMessage(activeChat.id, textToSend).subscribe({
      error: (err) => {
        console.error('Failed to send message', err);
        // Restore text on error
        this.messageText = textToSend;
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const activeChat = this.chatState.activeChat();
    if (!activeChat) return;

    // Determine Type
    let type = TipoMensaje.FILE;
    if (file.type.startsWith('image/')) type = TipoMensaje.IMAGE;
    else if (file.type.startsWith('video/')) type = TipoMensaje.VIDEO;
    else if (file.type.startsWith('audio/')) type = TipoMensaje.AUDIO;

    // Upload
    this.uploadService.uploadFileSimple(file).subscribe({
      next: (publicUrl: string) => {
        // Send as message
        this.chatService.sendMessage(activeChat.id, publicUrl, type).subscribe({
          error: (err: any) => console.error('Failed to send file message', err)
        });
      },
      error: (err: any) => console.error('Upload failed', err)
    });
  }
}
