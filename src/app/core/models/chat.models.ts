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

export interface MensajeResumenDTO {
    contenido: string;
    correoRemitente: string;
    tipo: TipoMensaje;
    hora: string; // ISO string
    borradoParaTodos: boolean;
}

export interface ChatListResponseDTO {
    idChat: number;
    tipo: string;
    nombreChat: string;
    urlAvatar: string;
    ultimoMensaje?: MensajeResumenDTO;
    conteoNoLeidos: number;
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
