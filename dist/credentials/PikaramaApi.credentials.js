"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PikaramaApi = void 0;
class PikaramaApi {
    constructor() {
        this.name = 'pikaramaApi';
        this.displayName = 'Pikarama API';
        this.documentationUrl = 'https://www.pikarama.com/docs/api';
        this.properties = [
            {
                displayName: 'API Token',
                name: 'apiToken',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
                description: 'API token from Pikarama Settings > API Tokens',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://www.pikarama.com',
                description: 'Pikarama API base URL',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.apiToken}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/api/v1/groups',
                method: 'GET',
            },
        };
    }
}
exports.PikaramaApi = PikaramaApi;
