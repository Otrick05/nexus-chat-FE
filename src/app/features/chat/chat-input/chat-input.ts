import { Component, inject, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  // --- Audio Recording & Preview State ---
  isRecording = false;
  isReviewing = false;
  recordingTime = '0:00';
  audioPreviewUrl: string | null = null;

  private recordingSeconds = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: any;
  private pendingAudioFile: File | null = null;

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

    console.log('File selected:', file.name, 'MIME type:', file.type, 'Mapped to Enum:', type);

    // Upload
    this.uploadService.uploadFileSimple(file).subscribe({
      next: (publicUrl: string) => {
        this.chatService.sendMessage(activeChat.id, publicUrl, type).subscribe({
          error: (err: any) => console.error('Failed to send file message', err)
        });
      },
      error: (err: any) => console.error('Upload failed', err)
    });
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.isReviewing = false;
      this.startTimer();
      this.cdr.detectChanges(); // Force UI update
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Could not access microphone.');
    }
  }

  cancelRecording() {
    this.stopRecorderInternal();
    this.isRecording = false;
    this.stopTimer();
    this.audioChunks = [];
    this.cdr.detectChanges();
  }

  stopAndReview() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;

    this.mediaRecorder.onstop = () => {
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });

      // Determine extension
      let ext = 'webm';
      if (mimeType.includes('mp4')) ext = 'mp4';
      else if (mimeType.includes('ogg')) ext = 'ogg';

      this.pendingAudioFile = new File([audioBlob], `voice_message_${Date.now()}.${ext}`, { type: mimeType });
      this.audioPreviewUrl = URL.createObjectURL(audioBlob);

      this.isReviewing = true;
      this.isRecording = false; // Stop recording view
      this.cdr.detectChanges();
    };

    this.stopRecorderInternal();
    this.stopTimer();
  }

  confirmSend() {
    if (this.pendingAudioFile) {
      this.uploadRecording(this.pendingAudioFile);
      this.cleanupReview();
    }
  }

  cancelReview() {
    this.cleanupReview();
  }

  private cleanupReview() {
    this.isReviewing = false;
    this.isRecording = false;
    this.pendingAudioFile = null;
    if (this.audioPreviewUrl) {
      URL.revokeObjectURL(this.audioPreviewUrl);
      this.audioPreviewUrl = null;
    }
    this.cdr.detectChanges();
  }

  private stopRecorderInternal() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  private uploadRecording(file: File) {
    const activeChat = this.chatState.activeChat();
    if (!activeChat) return;

    console.log('ChatInput: Initiating upload for file:', file.name, 'Type:', file.type, 'Size:', file.size);

    this.uploadService.uploadFileSimple(file).subscribe({
      next: (publicUrl: string) => {
        this.chatService.sendMessage(activeChat.id, publicUrl, TipoMensaje.AUDIO).subscribe({
          error: (err: any) => console.error('Failed to send audio', err)
        });
      },
      error: (err: any) => console.error('Audio upload failed', err)
    });
  }

  private startTimer() {
    this.recordingSeconds = 0;
    this.recordingTime = '0:00';
    clearInterval(this.timerInterval);

    // Using detectChanges ensures it updates
    this.timerInterval = setInterval(() => {
      this.recordingSeconds++;
      const minutes = Math.floor(this.recordingSeconds / 60);
      const seconds = this.recordingSeconds % 60;
      this.recordingTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      this.cdr.detectChanges();
    }, 1000);
  }

  private stopTimer() {
    clearInterval(this.timerInterval);
    this.recordingSeconds = 0;
    this.recordingTime = '0:00';
  }
}
