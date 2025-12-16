import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { RxStomp } from '@stomp/rx-stomp';
import { isPlatformBrowser } from '@angular/common';


import { JwtPayload } from '../models/jwt-payload.models';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class WebSocketService extends RxStomp {
    constructor() {
        super();
    }

    private platformId = inject(PLATFORM_ID);

    connect(token: string) {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        try {
            const payload = this.decodeJwt(token);
            if (payload && payload.exp * 1000 < Date.now()) {
                console.warn('WebSocket connection aborted: Token is expired.');
                return;
            }
        } catch (error) {
            console.error('WebSocket connection aborted: Invalid token.', error);
            return;
        }

        this.configure({
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 20000,
            reconnectDelay: 2000,
            debug: (msg: string) => console.log(new Date(), msg),
            webSocketFactory: () => {
                try {
                    const payload = this.decodeJwt(token);
                    if (payload && payload.exp * 1000 < Date.now()) {
                        console.warn('WebSocket reconnection aborted: Token is expired.');
                        this.deactivate(); // Stop the reconnection loop
                        return null as any; // Return null to abort connection attempt
                    }
                    return new WebSocket(environment.wsUrl);
                } catch (error) {
                    console.error('WebSocket factory error:', error);
                    this.deactivate();
                    return null as any;
                }
            }
        });

        this.activate();
    }

    disconnect() {
        this.deactivate();
    }

    private decodeJwt(token: string): JwtPayload {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            throw new Error('Failed to decode JWT');
        }
    }
}
