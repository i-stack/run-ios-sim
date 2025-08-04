import WebSocket from 'ws';
import { EnvConfig } from '../env';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export class WebSocketService extends EventEmitter {
    private logger: Logger;
    private ws: WebSocket | null;
    private url: string;
    private reconnectInterval: number;
    private maxReconnectAttempts: number;
    private reconnectAttempts: number;
    private isConnected: boolean;

    constructor(url = EnvConfig.websocketUrl(), reconnectInterval = 5000, maxReconnectAttempts = 5) {
        super();
        this.logger = new Logger('WebSocketService');
        this.ws = null;
        this.url = url;
        this.reconnectInterval = reconnectInterval;
        this.maxReconnectAttempts = maxReconnectAttempts;
        this.reconnectAttempts = 0;
        this.isConnected = false;
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);
            this.ws.on('open', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.logger.info('WebSocket connected successfully');
                this.emit('connected');
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.emit('message', message);
                } catch (error) {
                    this.logger.error(`Error parsing WebSocket message: ${error}`);
                }
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                this.logger.info('WebSocket connection closed');
                this.emit('disconnected');
                this.reconnect();
            });

            this.ws.on('error', (error: Error) => {
                this.logger.error(`WebSocket error: ${error}`);
                this.emit('error', error);
            });
        } catch (error) {
            this.logger.error(`Error creating WebSocket connection: ${error}`);
            this.reconnect();
        }
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectInterval);
        } else {
            this.logger.error('Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
        }
    }

    send(data: any) {
        if (this.ws && this.isConnected) {
            try {
                const message = JSON.stringify(data);
                this.ws.send(message);
            } catch (error) {
                this.logger.error(`Error sending WebSocket message: ${error}`);
                this.emit('error', error);
            }
        } else {
            this.logger.warn('WebSocket is not connected');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }

    isConnectionActive() {
        return this.isConnected;
    }
} 