export interface DeviceConfig {
	udid: string;
	deviceName: string;
	platformVersion: string;
	bundleId: string;
	appPath?: string;
}

export interface AppiumConfig {
	host: string;
	port: number;
	deviceConfig: DeviceConfig;
	capabilities: WebdriverIO.Capabilities;
}

export interface ApiResponse {
	url: string;
	method: string;
	requestBody?: any;
	responseBody?: any;
	statusCode: number;
	timestamp: string;
	deviceId: string;
}

export interface WebSocketMessage {
	type: 'command' | 'status' | 'result';
	data: any;
	timestamp: string;
	messageId: string;
} 