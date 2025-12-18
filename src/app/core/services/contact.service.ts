import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry, tap } from 'rxjs';
import { Contacto } from '../models/contacto.models';



import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ContactService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/contactos`;

    // State
    public contacts = signal<Contacto[]>([]);

    getContacts(): Observable<Contacto[]> {
        return this.http.get<Contacto[]>(`${this.API_URL}`).pipe(
            retry({ count: 3, delay: 1000 })
        );
    }

    loadContacts() {
        this.getContacts().subscribe({
            next: (data) => this.contacts.set(data),
            error: (err) => console.error('Error loading contacts:', err)
        });
    }

    addContact(correo: string): Observable<any> {
        return this.http.post(`${this.API_URL}/agregar/${correo}`, {}).pipe(
            tap(() => this.loadContacts()) // Refresh state on success
        );
    }
}
