import { Injectable, inject, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subscription, retry, tap, map } from 'rxjs';
import { Chat, ChatListResponseDTO, mensaje, CreateChatRequest, TipoMensaje, PaginatedMessageResponse, ChatEventDTO, ChatEventType, MensajeDTO, MensajeNotificationDTO } from '../models/chat.models';
import { Contacto } from '../models/contacto.models';
import { ChatStateService } from './chat.state';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';

import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private http = inject(HttpClient);
    private state = inject(ChatStateService);
    private ws = inject(WebSocketService);
    private auth = inject(AuthService);

    private readonly API_URL = environment.apiUrl;

    // Track active socket subscription to unsubscribe when switching chats
    private activeChatParamsSub?: Subscription;
    private globalMessagesSub?: Subscription;

    constructor() {
        // Auto-connect socket when user logs in
        effect(() => {
            const user = this.auth.currentUser();
            if (user) {
                const token = this.auth.getToken();
                if (token) {
                    this.ws.connect(token);
                    this.subscribeToGlobalMessages();
                }
            } else {
                this.ws.disconnect();
                this.unsubscribeGlobalMessages();
            }
        });
    }

    getChats(): Observable<ChatListResponseDTO[]> {
        return this.http.get<ChatListResponseDTO[]>(`${this.API_URL}/chats`).pipe(
            retry({ count: 3, delay: 1000 }),
            tap((chatsDTO) => {
                // Map DTO to internal Chat model if needed, or use DTO directly if it matches enough
                // For now, we assume we might need to map it to 'Chat' interface roughly
                // If models differ significantly, we map here.
                // Assuming ChatListResponseDTO is close enough to start, or we map:
                const mappedChats: Chat[] = chatsDTO.map(dto => ({
                    id: dto.idChat,
                    nombre: dto.nombreChat,
                    tipo: dto.tipo as 'PRIVADO' | 'GRUPO',
                    avatarUrl: dto.urlAvatar,
                    participantes: [],
                    conteoNoLeidos: dto.conteoNoLeidos,
                    ultimoMensaje: dto.ultimoMensaje ? {
                        id: 0, // summary doesn't have ID
                        chatId: dto.idChat,
                        correoRemitente: dto.ultimoMensaje.remitenteCorreo,
                        contenido: dto.ultimoMensaje.contenido,
                        tipoMensaje: TipoMensaje.TEXT, // Default for summary
                        timestamp: dto.ultimoMensaje.hora,
                        remitenteNombre: dto.ultimoMensaje.nombreRemitente,
                        isRead: true // summary doesn't say
                    } : undefined
                }));
                this.state.setChats(mappedChats);
            })
        );
    }

    /**
     * Opens a chat: Sets active ID, loads initial messages, subscribes to WS.
     */
    openChat(chatId: number) {
        this.state.setActiveChat(chatId);
        this.loadMessages(chatId, 0); // Load Page 0 / First 20

        // Subscribe to specific chat topic
        if (this.activeChatParamsSub) {
            this.activeChatParamsSub.unsubscribe();
        }

        // Watch for new messages in this chat
        // Assumption: Backend publishes to /topic/chat/{id}
        this.activeChatParamsSub = this.ws.watch(`/topic/chat/${chatId}`).subscribe({
            next: (messageFrame) => {
                const dto = JSON.parse(messageFrame.body);
                // Map Backend DTO to Frontend 'mensaje' interface
                const msg: mensaje = {
                    id: dto.id,
                    chatId: dto.chatId,
                    correoRemitente: dto.remitente.correo,
                    contenido: dto.contenido,
                    tipoMensaje: dto.tipoMensaje,
                    timestamp: dto.hora, // Java Instant (ISO string)
                    remitenteNombre: dto.remitente.nombreUsuario,
                    remitenteAvatar: dto.remitente.avatarUrl,
                    isRead: true, // Incoming in active chat is read
                };
                this.state.upsertMessage(msg);
            },
            error: (err) => console.error('WS Error for chat ' + chatId, err)
        });
    }

    /**
     * Loads messages from REST and merges into State.
     * @param page Pagination index (e.g. 0 for latest)
     */
    loadMessages(chatId: number, page: number = 0) {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', '20');

        this.http.get<PaginatedMessageResponse>(`${this.API_URL}/chats/${chatId}/mensajes`, { params }).subscribe({
            next: (response) => {
                const mappedMessages: mensaje[] = response.content.map(dto => ({
                    id: dto.id,
                    chatId: dto.chatId,
                    correoRemitente: dto.remitente.correo,
                    contenido: dto.contenido,
                    tipoMensaje: dto.tipoMensaje,
                    timestamp: dto.hora,
                    remitenteNombre: dto.remitente.nombreUsuario,
                    remitenteAvatar: dto.remitente.avatarUrl,
                    isRead: true
                }));

                if (page === 0) {
                    mappedMessages.forEach(m => this.state.upsertMessage(m));
                } else {
                    this.state.prependMessages(chatId, mappedMessages);
                }
            },
            error: (err) => console.error('Failed to load messages', err)
        });
    }

    sendMessage(chatId: number, content: string, tipo: TipoMensaje = TipoMensaje.TEXT): Observable<any> {
        // Check if this is a provisional chat (ID -1)
        if (chatId === -1) {
            const activeChat = this.state.activeChat();
            if (activeChat && activeChat.isTemp && activeChat.contactEmail) {
                // Create the chat first
                return this.createChat(activeChat.contactEmail, content).pipe(
                    tap((response: any) => {
                        // Assuming response contains the new chat ID, switch to it
                        // You might need to verify what the backend returns. 
                        // If it returns a Chat DTO with idChat:
                        if (response && response.idChat) {
                            this.openChat(response.idChat);
                        }
                    })
                );
            } else {
                throw new Error('No valid provisional chat found to create.');
            }
        }

        // Standard send for existing chat
        return this.http.post<mensaje>(`${this.API_URL}/chats/${chatId}/mensajes`, {
            chatId: chatId,

            contenido: content,
            tipoMensaje: tipo
        }).pipe(
            tap(savedMsg => {
                // Enrich message with local user data to ensure optimistic UI updates work correctly
                const currentUser = this.auth.currentUser();
                if (currentUser) {
                    if (!savedMsg.remitenteNombre) savedMsg.remitenteNombre = currentUser.nombreAppUsuario || currentUser.nombreUsuario;
                    if (!savedMsg.remitenteAvatar) savedMsg.remitenteAvatar = currentUser.avatarUrl;
                    if (!savedMsg.correoRemitente) savedMsg.correoRemitente = currentUser.correo;
                }
                // Ensure timestamp exists
                if (!savedMsg.timestamp) savedMsg.timestamp = new Date().toISOString();

                this.state.upsertMessage(savedMsg);
            })
        );
    }

    /**
     * Starts a chat session with a contact.
     * Checks if a chat already exists (by name matching since participants missing).
     * If not, sets a provisional chat state.
     */
    startChatWithContact(contact: Contacto) {
        // Try to find existing chat by name (heuristic since participants are missing in DTO)
        // ideally backend should provide participants or we search by specific endpoint
        const existingChat = this.state.chats().find(c =>
            c.nombre === contact.nombreAppUsuario ||
            c.nombre === contact.nombreUsuario
        );

        if (existingChat) {
            this.openChat(existingChat.id);
        } else {
            // Create provisional chat
            const provisional: Chat = {
                id: -1, // Indicates temp
                nombre: contact.nombreAppUsuario || contact.nombreUsuario,
                tipo: 'PRIVADO',
                avatarUrl: contact.avatarUrl,
                participantes: [contact.correo],
                conteoNoLeidos: 0,
                isTemp: true,
                contactEmail: contact.correo
            };
            this.state.setProvisionalChat(provisional);
            // Clear messages from state so the view shows empty or clean slate (if logged in)
            this.state.clearActiveMessages();
        }
    }


    createChat(contactEmail: string, firstMessage: string): Observable<any> {
        const payload: CreateChatRequest = {
            emailsMiembros: [contactEmail],
            tipo: 'PRIVADO',
            mensajeInicial: firstMessage,
            tipoMensaje: 'TEXTO'
        };

        return this.http.post<any>(`${this.API_URL}/chats/newchat`, payload).pipe(
            tap((response) => {
                this.getChats().subscribe(); // Refresh list
            })
        );
    }

    createGroup(name: string, participants: string[]): Observable<any> {
        const payload: CreateChatRequest = {
            nombreChat: name,
            emailsMiembros: participants,
            tipo: 'GRUPO'
        };
        return this.http.post<any>(`${this.API_URL}/chats/grupo`, payload).pipe(
            tap(() => {
                this.getChats().subscribe(); // Refresh list to show new group
            })
        );
    }

    private subscribeToGlobalMessages() {
        if (this.globalMessagesSub) return;

        // Subscribe to user-specific queue for real-time updates (global)
        this.globalMessagesSub = this.ws.watch('/user/queue/notificaciones').subscribe({
            next: (messageFrame) => {
                console.log('WS Notification Frame:', messageFrame.body); // DEBUG LOG
                try {
                    const event: ChatEventDTO = JSON.parse(messageFrame.body);
                    console.log('WS Parsed Event:', event); // DEBUG LOG
                    const currentUserEmail = this.auth.currentUser()?.correo;

                    switch (event.type) {
                        case ChatEventType.NEW_MESSAGE_NOTIFICATION:
                            // Payload is MensajeNotificationDTO based on recent logs
                            const msgDTO: MensajeNotificationDTO = event.payload;

                            const msg: mensaje = {
                                id: msgDTO.id,
                                chatId: msgDTO.chatId,
                                correoRemitente: msgDTO.remitenteEmail, // Mapped from flat DTO
                                contenido: msgDTO.contenido,
                                tipoMensaje: msgDTO.tipoMensaje,
                                timestamp: msgDTO.hora,
                                remitenteNombre: msgDTO.remitenteNombre, // Mapped from flat DTO
                                remitenteAvatar: msgDTO.remitenteAvatar,
                                isRead: false
                            };
                            console.log('Handling Incoming Message:', msg); // DEBUG LOG
                            this.state.handleIncomingMessage(msg, currentUserEmail);
                            break;

                        case ChatEventType.NEW_CHAT:
                        case ChatEventType.CHAT_UPDATED:
                            // Payload is ChatListResponseDTO
                            const chatDTO: ChatListResponseDTO = event.payload;
                            console.log('Handling Chat Update/New:', chatDTO); // DEBUG LOG
                            const chat: Chat = {
                                id: chatDTO.idChat,
                                nombre: chatDTO.nombreChat,
                                tipo: chatDTO.tipo as 'PRIVADO' | 'GRUPO',
                                avatarUrl: chatDTO.urlAvatar,
                                participantes: chatDTO.participantes ? chatDTO.participantes.map(p => p.correo) : [],
                                conteoNoLeidos: chatDTO.conteoNoLeidos,
                                ultimoMensaje: chatDTO.ultimoMensaje ? {
                                    id: 0, // Summary has no ID
                                    chatId: chatDTO.idChat,
                                    correoRemitente: chatDTO.ultimoMensaje.remitenteCorreo,
                                    contenido: chatDTO.ultimoMensaje.contenido,
                                    // Missing 'tipo' in summary DTO, assume TEXT or infer? 
                                    // For summary display it might not matter much in list view if just showing text 
                                    // but if using 'tipoMensaje' field...
                                    tipoMensaje: TipoMensaje.TEXT,
                                    timestamp: chatDTO.ultimoMensaje.hora,
                                    remitenteNombre: chatDTO.ultimoMensaje.nombreRemitente,
                                    isRead: true
                                } : undefined
                            };
                            this.state.upsertChat(chat);
                            break;

                        default:
                            console.log('Unhandled Chat Event:', event.type);
                    }

                } catch (e) {
                    console.error('Error parsing global message', e);
                }
            },
            error: (err) => console.error('Global WS Error', err)
        });
        console.log('ChatService: Subscribed to /user/queue/notificaciones'); // DEBUG LOG
    }

    private unsubscribeGlobalMessages() {
        if (this.globalMessagesSub) {
            this.globalMessagesSub.unsubscribe();
            this.globalMessagesSub = undefined;
        }
    }
}
