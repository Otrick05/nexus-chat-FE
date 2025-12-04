import { Pipe, PipeTransform } from '@angular/core';
import { Usuario } from '../../core/models/usuario.models';
import { Contact } from '../../core/models/contact.models';

@Pipe({
    name: 'avatarUrl',
    standalone: true
})
export class AvatarUrlPipe implements PipeTransform {

    transform(user: Usuario | Contact | null): string {
        if (!user) {
            return 'https://placehold.co/40x40/6b7280/FFF?text=?';
        }

        if (user.avatarUrl) {
            return user.avatarUrl;
        }

        const initial = user.nombreAppUsuario ? user.nombreAppUsuario.charAt(0).toUpperCase() : '?';
        return `https://placehold.co/40x40/4F3A6F/FFF?text=${initial}`;
    }

}
