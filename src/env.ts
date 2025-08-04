export class EnvConfig {
    static PROD = 'production';
    static DEV = 'development';
    static WIN = 'windows';

    static getEnv() {
        return EnvConfig.PROD;
    }

    static getPort() {
        return 5200;
    }

    static baseHost() {
        const env = this.getEnv();
        switch (env) {
            case EnvConfig.PROD:
                return 'https://ccss.yhyuanma.com';
            case EnvConfig.WIN:
                return `http://192.168.1.139:${this.getPort()}`;
            default:
                return `http://localhost:${this.getPort()}`;
        }
    }

    static baseUrl() {
        return `${this.baseHost()}/api/viber`;
    }

    static getNumberUrl() {
        return `${this.baseUrl()}/firefox/phone`;
    }

    static getSmsUrl() {
        return `${this.baseUrl()}/firefox/code`;
    }

    static websocketUrl() {
        const env = this.getEnv();
        switch (env) {
            case EnvConfig.PROD:
                return 'wss://ccss.yhyuanma.com/ws';
            case EnvConfig.WIN:
                return `ws://192.168.1.139:${this.getPort()}/ws`;
            default:
                return `ws://localhost:${this.getPort()}/ws`;
        }
    }
} 