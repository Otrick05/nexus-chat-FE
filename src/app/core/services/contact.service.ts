import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contact } from '../models/contact.models';



@Injectable({
    providedIn: 'root'
})
export class ContactService {
    private http = inject(HttpClient);
    private readonly API_URL = 'http://localhost:8080/api/contactos';

    getContacts(): Observable<Contact[]> {
        return this.http.get<Contact[]>(`${this.API_URL}/`);
    }

    addContact(correo: string): Observable<any> {
        return this.http.post(`${this.API_URL}/agregar/${correo}`, {});
    }
}
