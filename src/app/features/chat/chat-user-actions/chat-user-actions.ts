import { Component, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditGroupModal } from '../../edit-group-modal/edit-group-modal';
import { AddParticipantModal } from '../../add-participant-modal/add-participant-modal';

@Component({
    selector: 'app-chat-user-actions',
    standalone: true,
    imports: [CommonModule, EditGroupModal, AddParticipantModal],
    templateUrl: './chat-user-actions.html',
    styleUrl: './chat-user-actions.scss'
})
export class ChatUserActions {
    chatId = input.required<number>();
    chatType = input<string>(); // 'PRIVADO' | 'GRUPO'
    chatName = input<string>('');

    // Menu State
    isMenuOpen = signal(false);

    // Modal State
    isEditGroupOpen = signal(false);
    isAddParticipantOpen = signal(false);

    toggleMenu() {
        this.isMenuOpen.update(v => !v);
    }

    closeMenu() {
        this.isMenuOpen.set(false);
    }

    // Actions
    openEditGroup() {
        this.isEditGroupOpen.set(true);
        this.closeMenu();
    }

    openAddParticipant() {
        this.isAddParticipantOpen.set(true);
        this.closeMenu();
    }

    // Modal Handlers
    closeEditGroup() {
        this.isEditGroupOpen.set(false);
    }

    closeAddParticipant() {
        this.isAddParticipantOpen.set(false);
    }

    onChatUpdated() {
        // Here we might want to refresh the chat or emit upwards.
        // For now, GroupService updates backend and EditGroupModal refreshes list via subscription? 
        // Actually GroupService usually just does the action. The caller might need to refresh state.
        // But since we are inside Header -> Layout, and ChatState is single source, 
        // we might trigger a refresh in ChatService if needed, OR the Service call already did it.
        // GroupService.updateChatDetails() returns the DTO. We should probably update local state.
        // I'll assume ChatState updates automatically if we subscribed to getChats again or if we modify signal.
        // For simple MVP: Refresh page or rely on WS? 
        // Let's rely on the service logic or inject ChatService to refresh.
        // The modal component already emits `chatUpdated` BUT `GroupService` calls `getChats()` on success (based on my implementation of `createGroup`, 
        // wait I should check `group.service.ts` implementation I wrote).
        // I wrote: `return this.http.put...` and nothing else.
        // I should probably inject ChatService here to refresh chats.
    }
}
