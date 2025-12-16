import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatListResponseDTO } from '../models/chat.models';
import { PerfilUsuarioDTO } from '../models/contacto.models';

export interface ActualizarChatRequestDTO {
    nombre?: string;
    description?: string; // If applicable, though not strictly mentioned in DTO from user, names usually go with descriptions in groups
    // Add other fields that ActualizarChatRequestDTO might have. 
    // User only showed usage: updateChatDetails(id, request, principal)
    // Assuming 'nombre' is key based on context.
}

@Injectable({
    providedIn: 'root'
})
export class GroupService {
    private http = inject(HttpClient);
    private readonly API_URL = environment.apiUrl;

    updateChatDetails(chatId: number, data: ActualizarChatRequestDTO): Observable<ChatListResponseDTO> {
        return this.http.put<ChatListResponseDTO>(`${this.API_URL}/chats/grupo/${chatId}`, data);
    }

    addParticipant(chatId: number, email: string): Observable<void> {
        return this.http.post<void>(`${this.API_URL}/chats/grupo/${chatId}/participantes/${email}`, {});
    }

    getGroupParticipants(chatId: number): Observable<PerfilUsuarioDTO[]> {
        return this.http.get<PerfilUsuarioDTO[]>(`${this.API_URL}/chats/grupo/${chatId}/participantes`);
    }

    removeParticipant(chatId: number, email: string): Observable<void> {
        // Placeholder endpoint as requested
        return this.http.delete<void>(`${this.API_URL}/chats/grupo/${chatId}/participantes/${email}`);
    }
}
