import WebSocket from 'ws';
import { WebSocketMessage } from '../types';
import { Logger } from '../utils/logger';

export class WebSocketService {
	private wss: WebSocket.Server;
	private clients: Set<WebSocket> = new Set();
	private logger: Logger;
	private messageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();

	constructor(port: number = 8080) {
		this.logger = new Logger('WebSocketService');
		this.wss = new WebSocket.Server({ port });
		this.initialize();
	}

	private initialize(): void {
		this.wss.on('connection', (ws: WebSocket) => {
			this.logger.info('New WebSocket client connected');
			this.clients.add(ws);
			ws.on('message', (data: WebSocket.Data) => {
				try {
					const message: WebSocketMessage = JSON.parse(data.toString());
					this.handleMessage(message, ws);
				} catch (error) {
					this.logger.error('Failed to parse WebSocket message:', error);
					this.sendError(ws, 'Invalid message format');
				}
			});

			ws.on('close', () => {
				this.logger.info('WebSocket client disconnected');
				this.clients.delete(ws);
			});

			ws.on('error', (error) => {
				this.logger.error('WebSocket error:', error);
				this.clients.delete(ws);
			});

			this.sendMessage(ws, {
				type: 'status',
				data: { status: 'connected', message: 'WebSocket server ready' },
				timestamp: new Date().toISOString(),
				messageId: this.generateMessageId()
			});
		});
		this.logger.info(`WebSocket server started on port ${this.wss.options.port}`);
	}

	private handleMessage(message: WebSocketMessage, ws: WebSocket): void {
		this.logger.info(`Received message: ${message.type}`, message);
		const handler = this.messageHandlers.get(message.type);
		if (handler) {
			handler(message);
		} else {
			this.logger.warn(`No handler found for message type: ${message.type}`);
			this.sendError(ws, `Unknown message type: ${message.type}`);
		}
	}

	public registerMessageHandler(type: string, handler: (message: WebSocketMessage) => void): void {
		this.messageHandlers.set(type, handler);
	}

	public broadcast(message: WebSocketMessage): void {
		const messageStr = JSON.stringify(message);
		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(messageStr);
			}
		});
	}

	public sendMessage(ws: WebSocket, message: WebSocketMessage): void {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
	}

	private sendError(ws: WebSocket, error: string): void {
		this.sendMessage(ws, {
			type: 'status',
			data: { status: 'error', error },
			timestamp: new Date().toISOString(),
			messageId: this.generateMessageId()
		});
	}

	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	public getConnectedClientsCount(): number {
		return this.clients.size;
	}

	public close(): void {
		this.wss.close();
		this.logger.info('WebSocket server closed');
	}
} 