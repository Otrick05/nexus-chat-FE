import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { Contacto } from '../models/contacto.models';



import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ContactService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/contactos`;

    getContacts(): Observable<Contacto[]> {
        return this.http.get<Contacto[]>(`${this.API_URL}`).pipe(
            retry({ count: 3, delay: 1000 })
        );
    }

    addContact(correo: string): Observable<any> {
        return this.http.post(`${this.API_URL}/agregar/${correo}`, {});
    }
}
