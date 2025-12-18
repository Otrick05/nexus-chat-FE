import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { Observable, switchMap, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SignedUrlResponse {
    fileName: string;
    signedUrl: string;
    contentType: string;
}

@Injectable({
    providedIn: 'root'
})
export class UploadService {

    private http = inject(HttpClient);
    private httpBackend = inject(HttpBackend);
    private anonymousHttp = new HttpClient(this.httpBackend);

    // Adjust base URL as needed
    private readonly API_URL = environment.apiUrl;

    /**
     * 1. Request Signed URL from Backend
     * 2. Upload File to GCP via Signed URL
     * 3. Return the Public URL
     */
    uploadFile(file: File): Observable<string> {
        return this.uploadFileSimple(file).pipe(map(res => res.publicUrl));
    }

    // Simplified version without progress events for easier integration first
    uploadFileSimple(file: File): Observable<{ publicUrl: string, storageFileName: string }> {
        const signEndpoint = `${this.API_URL}/files/signed-url`;
        const payload = {
            fileName: file.name,
            contentType: file.type
        };
        console.log('UploadService: Requesting signed URL with payload:', payload);

        return this.http.post<any>(signEndpoint, payload).pipe(
            tap(res => console.log('DEBUG: Signed URL Response:', res)),
            switchMap(response => {
                // Handle both single object and array response
                const data = Array.isArray(response) ? response[0] : response;

                // Map fields from verified backend DTO: fileName, signedUrl, contentType
                const uploadUrl = data.signedUrl;
                const storageFileName = data.fileName; // The UUID prefixed name

                if (!uploadUrl) {
                    console.error('ERROR: signedUrl is missing in response!', response);
                    throw new Error('signedUrl is missing');
                }

                // EXTRACT Public URL: Remove query parameters from the signed URL
                const publicUrl = uploadUrl.split('?')[0];

                // Use anonymousHttp to bypass interceptors for the external GCS URL
                return this.anonymousHttp.put(uploadUrl, file, {
                    headers: { 'Content-Type': file.type }
                }).pipe(
                    tap(response => console.log('DEBUG: Response from GCS Bucket:', response)),
                    map(() => ({ publicUrl, storageFileName }))
                );
            })
        );
    }
}
