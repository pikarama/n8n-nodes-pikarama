import {
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import crypto from 'crypto';

export class PikaramaTrigger implements INodeType {
	description: INodeTypeDescription = {
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
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: [
					{ name: 'Event Created', value: 'event.created', description: 'Triggered when a new event is created' },
					{ name: 'Event Closed', value: 'event.closed', description: 'Triggered when an event is completed' },
					{ name: 'Vote Cast', value: 'event.voted', description: 'Triggered when a vote is cast' },
					{ name: 'Submission Added', value: 'submission.added', description: 'Triggered when a submission is added' },
				],
				default: ['event.created', 'event.closed'],
				description: 'Which events to listen for',
			},
			{
				displayName: 'Filter by Groups',
				name: 'filterByGroups',
				type: 'boolean',
				default: false,
				description: 'Whether to only receive events from specific groups (default: all groups)',
			},
			{
				displayName: 'Group IDs',
				name: 'groupIds',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						filterByGroups: [true],
					},
				},
				description: 'Comma-separated list of group IDs to filter (get IDs from Pikarama web app URL)',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('pikaramaApi');
				const baseUrl = credentials.baseUrl as string;

				try {
					const response = await fetch(`${baseUrl}/api/v1/webhooks`, {
						headers: {
							'Authorization': `Bearer ${credentials.apiToken}`,
							'Content-Type': 'application/json',
						},
					});

					if (!response.ok) {
						return false;
					}

					const data = await response.json() as { webhooks: Array<{ url: string }> };
					const webhooks = data.webhooks || [];

					return webhooks.some(w => w.url === webhookUrl);
				} catch {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('pikaramaApi');
				const baseUrl = credentials.baseUrl as string;
				const events = this.getNodeParameter('events') as string[];
				const filterByGroups = this.getNodeParameter('filterByGroups') as boolean;
				
				// Parse group IDs if filtering
				let groupIds: string[] | null = null;
				if (filterByGroups) {
					const groupIdsStr = this.getNodeParameter('groupIds') as string;
					if (groupIdsStr) {
						groupIds = groupIdsStr.split(',').map(id => id.trim()).filter(id => id);
					}
				}

				const response = await fetch(`${baseUrl}/api/v1/webhooks`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${credentials.apiToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						url: webhookUrl,
						events,
						groupIds,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json() as { error?: string; message?: string };
					throw new NodeOperationError(
						this.getNode(),
						`Failed to create webhook: ${errorData.error || errorData.message || 'Unknown error'}`
					);
				}

				const data = await response.json() as { webhook: { id: string; secret: string } };
				
				// Store webhook ID and secret for later deletion and verification
				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = data.webhook.id;
				webhookData.webhookSecret = data.webhook.secret;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookId = webhookData.webhookId as string;

				if (!webhookId) {
					// Webhook doesn't exist
					return true;
				}

				const credentials = await this.getCredentials('pikaramaApi');
				const baseUrl = credentials.baseUrl as string;

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
				} catch {
					// If deletion fails, still clean up stored data to prevent stale state
					delete webhookData.webhookId;
					delete webhookData.webhookSecret;
					return false;
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = this.getBodyData();
		const signature = req.headers['x-pikarama-signature'] as string;

		if (!signature) {
			throw new NodeOperationError(this.getNode(), 'Missing X-Pikarama-Signature header');
		}

		// Get stored webhook secret (from when webhook was created)
		const webhookData = this.getWorkflowStaticData('node');
		let secret = webhookData.webhookSecret as string;

		// Fallback to credentials if secret is not stored (e.g., after workflow import)
		if (!secret) {
			const credentials = await this.getCredentials('pikaramaApi');
			secret = credentials.webhookSecret as string;
			
			if (!secret) {
				throw new NodeOperationError(
					this.getNode(), 
					'Webhook secret not found. Please re-activate the workflow or add webhook secret to credentials.'
				);
			}
		}

		// Verify signature
		const bodyString = JSON.stringify(body);
		const expectedSignature = crypto
			.createHmac('sha256', secret)
			.update(bodyString)
			.digest('hex');

		if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
			throw new NodeOperationError(this.getNode(), 'Invalid webhook signature');
		}

		// Filter by event type
		const eventsToListenFor = this.getNodeParameter('events') as string[];
		const payloadEvent = (body as Record<string, unknown>).event as string;

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
