"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PikaramaTrigger = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const crypto_1 = __importDefault(require("crypto"));
class PikaramaTrigger {
    constructor() {
        this.description = {
            displayName: 'Pikarama Trigger',
            name: 'pikaramaTrigger',
            icon: 'file:pikarama.svg',
            group: ['trigger'],
            version: 1,
            description: 'Receive webhook events from Pikarama (event.created, event.closed, event.voted, submission.added)',
            defaults: {
                name: 'Pikarama Trigger',
            },
            inputs: [],
            outputs: ['main'],
            credentials: [
                {
                    name: 'pikaramaApi',
                    required: true,
                },
            ],
            webhooks: [
                {
                    name: 'default',
                    httpMethod: 'POST',
                    responseMode: 'onReceived',
                    path: 'webhook',
                },
            ],
            properties: [
                {
                    displayName: 'Group',
                    name: 'groupId',
                    type: 'string',
                    required: true,
                    default: '',
                    description: 'The group ID to listen for events from. Get this from the Pikarama web app URL.',
                },
                {
                    displayName: 'Events',
                    name: 'events',
                    type: 'multiOptions',
                    required: true,
                    options: [
                        { name: 'Event Created', value: 'event.created', description: 'Triggered when a new event is created' },
                        { name: 'Event Closed', value: 'event.closed', description: 'Triggered when an event is completed' },
                        { name: 'Event Voted', value: 'event.voted', description: 'Triggered when a vote is cast' },
                        { name: 'Submission Added', value: 'submission.added', description: 'Triggered when a submission is added' },
                    ],
                    default: ['event.created', 'event.closed'],
                    description: 'Which events to listen for',
                },
            ],
        };
        this.webhookMethods = {
            default: {
                async checkExists() {
                    const webhookUrl = this.getNodeWebhookUrl('default');
                    const credentials = await this.getCredentials('pikaramaApi');
                    const baseUrl = credentials.baseUrl;
                    const groupId = this.getNodeParameter('groupId');
                    try {
                        const response = await fetch(`${baseUrl}/api/v1/groups/${groupId}/webhooks`, {
                            headers: {
                                'Authorization': `Bearer ${credentials.apiToken}`,
                                'Content-Type': 'application/json',
                            },
                        });
                        if (!response.ok) {
                            return false;
                        }
                        const data = await response.json();
                        const webhooks = data.webhooks || [];
                        return webhooks.some(w => w.url === webhookUrl);
                    }
                    catch {
                        return false;
                    }
                },
                async create() {
                    const webhookUrl = this.getNodeWebhookUrl('default');
                    const credentials = await this.getCredentials('pikaramaApi');
                    const baseUrl = credentials.baseUrl;
                    const groupId = this.getNodeParameter('groupId');
                    const events = this.getNodeParameter('events');
                    const response = await fetch(`${baseUrl}/api/v1/groups/${groupId}/webhooks`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${credentials.apiToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            url: webhookUrl,
                            events,
                        }),
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to create webhook: ${errorData.error || errorData.message || 'Unknown error'}`);
                    }
                    const data = await response.json();
                    // Store webhook ID and secret for later deletion and verification
                    const webhookData = this.getWorkflowStaticData('node');
                    webhookData.webhookId = data.webhook.id;
                    webhookData.webhookSecret = data.webhook.secret;
                    return true;
                },
                async delete() {
                    const webhookData = this.getWorkflowStaticData('node');
                    const webhookId = webhookData.webhookId;
                    if (!webhookId) {
                        // Webhook doesn't exist
                        return true;
                    }
                    const credentials = await this.getCredentials('pikaramaApi');
                    const baseUrl = credentials.baseUrl;
                    try {
                        const response = await fetch(`${baseUrl}/api/v1/webhooks/${webhookId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${credentials.apiToken}`,
                                'Content-Type': 'application/json',
                            },
                        });
                        if (!response.ok && response.status !== 404) {
                            // Only throw if it's not a 404 (already deleted)
                            throw new Error(`HTTP ${response.status}`);
                        }
                        // Clean up stored data
                        delete webhookData.webhookId;
                        delete webhookData.webhookSecret;
                        return true;
                    }
                    catch (error) {
                        // If deletion fails, still clean up stored data to prevent stale state
                        delete webhookData.webhookId;
                        delete webhookData.webhookSecret;
                        return false;
                    }
                },
            },
        };
    }
    async webhook() {
        const req = this.getRequestObject();
        const body = this.getBodyData();
        const signature = req.headers['x-pikarama-signature'];
        if (!signature) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Missing X-Pikarama-Signature header');
        }
        // Get stored webhook secret (from when webhook was created)
        const webhookData = this.getWorkflowStaticData('node');
        let secret = webhookData.webhookSecret;
        // Fallback to credentials if secret is not stored (e.g., after workflow import)
        if (!secret) {
            const credentials = await this.getCredentials('pikaramaApi');
            secret = credentials.webhookSecret;
            if (!secret) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Webhook secret not found. Please re-activate the workflow or add webhook secret to credentials.');
            }
        }
        // Verify signature
        const bodyString = JSON.stringify(body);
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(bodyString)
            .digest('hex');
        if (!crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid webhook signature');
        }
        // Filter by event type
        const eventsToListenFor = this.getNodeParameter('events');
        const payloadEvent = body.event;
        if (!eventsToListenFor.includes(payloadEvent)) {
            // Event type not subscribed - return empty response
            return {
                workflowData: [],
            };
        }
        // Return the webhook payload
        return {
            workflowData: [
                this.helpers.returnJsonArray([body]),
            ],
        };
    }
}
exports.PikaramaTrigger = PikaramaTrigger;
