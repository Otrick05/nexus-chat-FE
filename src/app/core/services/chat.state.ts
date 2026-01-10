import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Chat, mensaje } from '../models/chat.models';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root',
})
export class ChatStateService {

    private chatsMap = signal<Map<number, Chat>>(new Map());
    private messagesMap = signal<Map<number, mensaje[]>>(new Map());
    activeChatId = signal<number | null>(null);
    private provisionalChat = signal<Chat | null>(null);


    private oldestMessageIdMap = signal<Map<number, number>>(new Map());

    // List of all chats (for the sidebar)
    chats = computed(() => Array.from(this.chatsMap().values()));

    // Active Chat Object
    activeChat = computed(() => {
        const id = this.activeChatId();
        if (id) {
            return this.chatsMap().get(id) || null;
        }
        return this.provisionalChat();
    });

    // Messages for the active chat
    activeMessages = computed(() => {
        const id = this.activeChatId();
        if (!id) return []; // Provisional chat has no messages initially
        return this.messagesMap().get(id) || [];
    });

    private authService = inject(AuthService);

    constructor() {
        // Reset state when user logs out
        effect(() => {
            if (!this.authService.currentUser()) {
                this.resetState();
            }
        });
    }

    private resetState() {
        this.chatsMap.set(new Map());
        this.messagesMap.set(new Map());
        this.activeChatId.set(null);
        this.provisionalChat.set(null);
        this.oldestMessageIdMap.set(new Map());
    }

    // --- Actions ---

    setActiveChat(chatId: number) {
        this.activeChatId.set(chatId);
        this.provisionalChat.set(null); // Clear provisional if we select a real chat

        // Reset unread count for this chat
        this.chatsMap.update((current) => {
            const chat = current.get(chatId);
            if (chat && chat.conteoNoLeidos > 0) {
                const newChat = { ...chat, conteoNoLeidos: 0 };
                const newMap = new Map(current);
                newMap.set(chatId, newChat);
                return newMap;
            }
            return current;
        });
    }

    setProvisionalChat(chat: Chat) {
        this.activeChatId.set(null);
        this.provisionalChat.set(chat);
    }

    clearProvisionalChat() {
        this.provisionalChat.set(null);
    }

    clearActiveMessages() {
    }

    setChats(chats: Chat[]) {
        this.chatsMap.update((current) => {
            const newMap = new Map(current);
            chats.forEach((c) => newMap.set(c.id, c));
            return newMap;
        });
    }


    upsertMessage(message: mensaje) {
        this.messagesMap.update((current) => {
            const chatMessages = current.get(message.chatId) || [];
            const index = chatMessages.findIndex((m) => m.id === message.id);

            let newMessages;
            if (index > -1) {
                // Update existing
                newMessages = [...chatMessages];
                newMessages[index] = message;
            } else {
                // Append new
                newMessages = [...chatMessages, message];
            }
            // Ideally sort by timestamp to be safe
            newMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const newMap = new Map(current);
            newMap.set(message.chatId, newMessages);
            return newMap;
        });
    }

    /**
     * Prepends older messages (for pagination/scroll-up).
     * Deduplicates against existing messages just in case.
     */
    prependMessages(chatId: number, messages: mensaje[]) {
        this.messagesMap.update((current) => {
            const existing = current.get(chatId) || [];

            // Filter out any that we already have (dedupe)
            const existingIds = new Set(existing.map(m => m.id));
            const newUnique = messages.filter(m => !existingIds.has(m.id));

            if (newUnique.length === 0) return current;

            const combined = [...newUnique, ...existing];
            // Sort again to be safe
            combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const newMap = new Map(current);
            newMap.set(chatId, combined);
            return newMap;
        });
    }

    /**
     * Sets the full list of messages (e.g. initial load), overwriting or merging.
     * Usually used for the first 20 items.
     */
    setMessages(chatId: number, mensajes: mensaje[]) {
        this.messagesMap.update(current => {
            const newMap = new Map(current);
            // For initial set, we might just trust the backend sort, but sorting is safer.
            const sorted = [...mensajes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            newMap.set(chatId, sorted);
            return newMap;
        });
    }

    /**
     * Updates or Inserts a chat into the list.
     * Used for NEW_CHAT or CHAT_UPDATED events.
     */
    upsertChat(chat: Chat) {
        console.log('ChatState: upsertChat called', chat);
        const currentUserEmail = this.authService.currentUser()?.correo;

        this.chatsMap.update((current) => {
            const isActive = this.activeChatId() === chat.id;

            // Prepare the new state for this chat
            // We start with the incoming chat object
            const newChat = { ...chat };

            // Logic for unread count:
            // If it's the active chat, unread count must be 0.
            // If it's NOT active:
            //    - If the incoming chat has a count, we might trust it OR we might need to increment it if we are just receiving a message summary.
            //    - However, NEW_CHAT usually implies a fresh state from backend. 
            //    - If the backend sent count=0 but it's a new message for us (not from us), we might want to ensure it shows as unread if we don't have it open.
            //    - BUT, usually the backend *should* send the correct count. 
            //    - The user request specifically mentioned "support for notification number".
            //    - Let's assume if we are not the sender and it's not active, we respect the backend count, 
            //      but if backend sends 0 and it's a new message event type effectively, maybe we force 1? 
            //      Actually, in NEW_CHAT payload, 'conteoNoLeidos' is provided. We should probably trust it unless it's 0 and we know it shouldn't be.
            //      But 'handleIncomingMessage' logic increments. 
            //      Let's blindly trust backend for NEW_CHAT but ensure if active it is 0.

            if (isActive) {
                newChat.conteoNoLeidos = 0;
            } else {
                // Check if we have a provisional/stub chat created by handleIncomingMessage
                // Stubs typically have empty participants
                const existingChat = current.get(chat.id);
                const isStub = existingChat && existingChat.participantes && existingChat.participantes.length === 0;

                // If it was a stub with unread messages, and the new payload says 0, likely the NEW_CHAT event didn't account for the message we just processed locally.
                if (isStub && (existingChat.conteoNoLeidos || 0) > 0 && newChat.conteoNoLeidos === 0) {
                    newChat.conteoNoLeidos = existingChat.conteoNoLeidos;
                }

                // If we are the sender, we shouldn't have unread messages typically
                if (newChat.ultimoMensaje?.correoRemitente === currentUserEmail) {
                    newChat.conteoNoLeidos = 0;
                }
            }

            const newMap = new Map(current);
            newMap.set(chat.id, newChat);
            return newMap;
        });
    }

    /**
     * Handles an incoming message from the global WebSocket subscription.
     * 1. Upserts the message if we have loaded messages for that chat (or if it's active).
     * 2. Updates the Chat List item (last message, unread count) regardless.
     */
    handleIncomingMessage(message: mensaje, currentAppUserEmail: string | undefined) {
        console.log('ChatState: handleIncomingMessage called', message); // DEBUG LOG
        // 1. Update the chat in the list (Sidebar)
        this.chatsMap.update((current) => {
            const chat = current.get(message.chatId);
            let newChat: Chat;

            if (!chat) {
                // Chat doesn't exist. Ideally a NEW_CHAT event should have handled this.
                // But as fallback, create a stub.
                newChat = {
                    id: message.chatId,
                    nombre: message.remitenteNombre || 'Chat',
                    tipo: 'PRIVADO',
                    avatarUrl: message.remitenteAvatar || '',
                    participantes: [],
                    conteoNoLeidos: 0
                };
            } else {
                newChat = { ...chat };
            }

            newChat.ultimoMensaje = message;

            // Increment unread if:
            // - The message sender is NOT the current user
            // - AND The chat is NOT active
            const isActive = this.activeChatId() === message.chatId;
            const isMe = message.correoRemitente === currentAppUserEmail;

            // Debug log
            // console.log(`Msg from ${message.correoRemitente}, Active: ${this.activeChatId()}, isMe: ${isMe}, isActive: ${isActive}`);

            if (!isMe && !isActive) {
                newChat.conteoNoLeidos = (newChat.conteoNoLeidos || 0) + 1;
            } else if (isActive) {
                // If active, ensure unread is 0 (just in case)
                newChat.conteoNoLeidos = 0;
            }

            const newMap = new Map(current);
            // Delete and re-set to force change detection if relies on map order (though computed usually handles this)
            newMap.delete(message.chatId);
            newMap.set(message.chatId, newChat);
            return newMap;
        });

        // 2. Upsert into messages map if applicable
        // We always upsert. If the map entry doesn't exist (chat never opened), upsertMessage handles it by creating a list [message].
        this.upsertMessage(message);
    }
}
