import { Pipe, PipeTransform } from '@angular/core';
import { Usuario } from '../../core/models/usuario.models';
import { Contacto } from '../../core/models/contacto.models';
import { ChatListResponseDTO, Chat } from '../../core/models/chat.models';

@Pipe({
    name: 'avatarUrl',
    standalone: true
})
export class AvatarUrlPipe implements PipeTransform {

    transform(user: Usuario | Contacto | ChatListResponseDTO | Chat | null): string {
        if (!user) {
            return 'https://placehold.co/40x40/6b7280/FFF?text=?';
        }


        const u = user as any;

        if (u.urlAvatar || u.avatarUrl) {
            return u.urlAvatar || u.avatarUrl;
        }

        let name = '?';
        if (u.nombreAppUsuario) name = u.nombreAppUsuario;
        else if (u.nombreUsuario) name = u.nombreUsuario;
        else if (u.nombreChat) name = u.nombreChat;
        else if (u.nombre) name = u.nombre; // Support for Chat model
        else if (u.name) name = u.name; // Legacy support
        else if (u.correo) name = u.correo; // fallback to email
        else if (u.nombreUsuario) name = u.nombreUsuario; // fallback for Usuario if needed

        const initial = name.charAt(0).toUpperCase();
        return `https://placehold.co/40x40/4F3A6F/FFF?text=${initial}`;
    }

}
