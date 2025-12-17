export enum TipoMensaje {
    TEXT = 'TEXTO',
    IMAGE = 'IMAGEN',
    VIDEO = 'VIDEO',
    AUDIO = 'AUDIO',
    FILE = 'ARCHIVO'
}

export interface mensaje {
    id: number;
    chatId: number;
    correoRemitente: string;
    contenido: string;
    tipoMensaje: TipoMensaje;
    timestamp: string; // ISO string
    mediaUrl?: string; // For future multimedia support
    isRead: boolean;
    remitenteNombre?: string;
    remitenteAvatar?: string;
}

export interface Chat {
    id: number;
    nombre: string;
    tipo: 'PRIVADO' | 'GRUPO';
    avatarUrl: string;
    participantes: string[]; // emails
    ultimoMensaje?: mensaje;
    conteoNoLeidos: number;
    // Provisional/Temp chat fields
    isTemp?: boolean;
    contactEmail?: string;
}

// DTO anidado para el resumen del mensaje
export interface MensajeResumenDTO {
    contenido: string;
    nombreRemitente: string;
    remitenteCorreo: string;
    hora: string; // ISO string
    borradoParaTodos: boolean;
    // tipo: TipoMensaje; // Removed as it wasn't in the user's DTO, but check if needed logic relies on it. 
    // User's DTO didn't show 'tipo' in MensajeResumenDTO.
}

export interface ParticipanteDTO {
    idUsuario: number;
    correo: string;
    nombreUsuario: string;
    avatarUrl: string;
    rol: string;
}

export interface ChatListResponseDTO {
    idChat: number;
    tipo: string;
    nombreChat: string;
    urlAvatar: string;
    ultimoMensaje?: MensajeResumenDTO;
    conteoNoLeidos: number;
    participantes: ParticipanteDTO[];
}

export interface CreateChatRequest {
    emailsMiembros: string[];
    nombreChat?: string;
    tipo: 'PRIVADO' | 'GRUPO';
    mensajeInicial?: string;
    tipoMensaje?: 'TEXTO' | 'ARCHIVO' | 'IMAGEN';
}

export interface MensajeDTO {
    id: number;
    chatId: number;
    contenido: string;
    hora: string;
    borradoParaTodos: boolean;
    tipoMensaje: TipoMensaje;
    remitente: {
        id: number;
        correo: string;
        nombreUsuario: string;
        avatarUrl?: string; // might be null
    };
    multimedia: any[]; // define stricter if needed
}

export interface PaginatedMessageResponse {
    content: MensajeDTO[];
    pageable: any;
    last: boolean;
    totalPages: number;
    totalElements: number;
    first: boolean;
    size: number;
    number: number;
    numberOfElements: number;
    empty: boolean;
}

export enum ChatEventType {
    MESSAGE_READ = 'MESSAGE_READ',
    USER_JOINED = 'USER_JOINED',
    USER_LEFT = 'USER_LEFT',
    OWNER_CHANGED = 'OWNER_CHANGED',
    CHAT_UPDATED = 'CHAT_UPDATED',
    NEW_CHAT = 'NEW_CHAT',
    TYPING = 'TYPING',
    NEW_MESSAGE_NOTIFICATION = 'NEW_MESSAGE_NOTIFICATION'
}

export interface ChatEventDTO {
    type: ChatEventType;
    payload: any; // Typed based on event in service
}

export interface MensajeNotificationDTO {
    id: number;
    chatId: number;
    contenido: string;
    tipoMensaje: TipoMensaje;
    hora: string;
    remitenteEmail: string;
    remitenteNombre: string;
    remitenteAvatar?: string; // Optional/Guessing based on pattern, user JSON didn't show it but good to have
}
