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
	capabilities: any;
}

export interface TestCommand {
	type: 'register' | 'login' | 'message' | 'custom';
	deviceId: string;
	parameters?: Record<string, any>;
}

export interface TestResult {
	success: boolean;
	deviceId: string;
	testType: string;
	duration: number;
	error?: string;
	data?: any;
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
	data: TestCommand | TestResult | any;
	timestamp: string;
	messageId: string;
} 