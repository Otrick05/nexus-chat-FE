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
     * Handles an incoming message from the global WebSocket subscription.
     * 1. Upserts the message if we have loaded messages for that chat (or if it's active).
     * 2. Updates the Chat List item (last message, unread count) regardless.
     */
    handleIncomingMessage(message: mensaje, currentAppUserEmail: string | undefined) {
        // 1. Update the chat in the list (Sidebar)
        this.chatsMap.update((current) => {
            const chat = current.get(message.chatId);
            let newChat: Chat;

            if (!chat) {
                // Chat doesn't exist (New Chat or Group)
                // We create a stub. Since we might miss details (like Group Name), we do our best.
                // LIFO: This new entry will be naturally at the end/top if we sort by last message.
                // Our 'chats' computed property currently just takes values(). 
                // Ideally, the consuming component sorts them, or we sort here?
                // The 'chats' computed signals usually don't guarantee order unless we sort.
                // But Maps preserve insertion order? No. 
                // We'll insert it. The Sidebar usually sorts by timestamp.
                newChat = {
                    id: message.chatId,
                    // Use sender name as chat name fallback (works for DM). For group, might be partial.
                    nombre: message.remitenteNombre || 'Nuevo Chat',
                    tipo: 'PRIVADO', // We guess default, but maybe payload has info if we expanded DTO. 
                    // But for now, safe default or check if multiple participants?
                    // Actually, if it's a notification, we assume it's a valid chat.
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
            // - AND (The chat is NOT active OR the window is not focused - simplified to just 'not active' for now)
            const isActive = this.activeChatId() === message.chatId;
            const isMe = message.correoRemitente === currentAppUserEmail;

            if (!isMe && !isActive) {
                newChat.conteoNoLeidos = (newChat.conteoNoLeidos || 0) + 1;
            }

            const newMap = new Map(current);
            // Delete and re-set to ensure it's "newest" in iteration order if component relies on that?
            // Or just set. Most reliable sort is to sort the array in the computed signal.
            newMap.set(message.chatId, newChat);
            return newMap;
        });

        // 2. Upsert into messages map if applicable
        // We always upsert. If the map entry doesn't exist (chat never opened), upsertMessage handles it by creating a list [message].
        // This is fine, effectively caching it.
        this.upsertMessage(message);
    }
}
