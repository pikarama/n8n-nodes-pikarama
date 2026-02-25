import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class Pikarama implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pikarama',
		name: 'pikarama',
		icon: 'file:pikarama.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Pikarama API for group decisions',
		defaults: {
			name: 'Pikarama',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'pikaramaApi',
				required: true,
			},
		],
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Event', value: 'event' },
					{ name: 'Group', value: 'group' },
					{ name: 'Karma', value: 'karma' },
				],
				default: 'event',
			},

			// ==================== EVENT OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: { resource: ['event'] },
				},
				options: [
					{ name: 'Create', value: 'create', description: 'Create a new event or poll', action: 'Create an event' },
					{ name: 'Get', value: 'get', description: 'Get event details', action: 'Get an event' },
					{ name: 'Get Many', value: 'getMany', description: 'List events', action: 'Get many events' },
					{ name: 'Submit', value: 'submit', description: 'Submit a pick', action: 'Submit a pick' },
					{ name: 'Vote', value: 'vote', description: 'Cast a vote', action: 'Vote on submissions' },
					{ name: 'Advance', value: 'advance', description: 'Advance to next phase', action: 'Advance event phase' },
					{ name: 'Cancel', value: 'cancel', description: 'Cancel an event', action: 'Cancel an event' },
				],
				default: 'create',
			},

			// Event: Create
			{
				displayName: 'Topic ID',
				name: 'topicId',
				type: 'string',
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['create'] },
				},
				default: '',
				description: 'The topic group ID for the event',
			},
			{
				displayName: 'Event Name',
				name: 'name',
				type: 'string',
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['create'] },
				},
				default: '',
				placeholder: 'Where should we eat tonight?',
				description: 'The question or decision to make',
			},
			{
				displayName: 'Is Poll',
				name: 'isPoll',
				type: 'boolean',
				displayOptions: {
					show: { resource: ['event'], operation: ['create'] },
				},
				default: false,
				description: 'Whether this is a poll with predefined options (no karma changes)',
			},
			{
				displayName: 'Poll Options',
				name: 'pollOptions',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: { resource: ['event'], operation: ['create'], isPoll: [true] },
				},
				default: [],
				placeholder: 'Add option',
				description: 'Predefined options for the poll (minimum 2)',
			},

			// Event: Get / Get Many / Submit / Vote / Advance / Cancel
			{
				displayName: 'Event ID',
				name: 'eventId',
				type: 'string',
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['get', 'submit', 'vote', 'advance', 'cancel'] },
				},
				default: '',
				description: 'The event ID',
			},

			// Event: Get Many filters
			{
				displayName: 'Status Filter',
				name: 'status',
				type: 'multiOptions',
				displayOptions: {
					show: { resource: ['event'], operation: ['getMany'] },
				},
				options: [
					{ name: 'Submitting', value: 'submitting' },
					{ name: 'Voting', value: 'voting' },
					{ name: 'Completed', value: 'completed' },
				],
				default: ['submitting', 'voting'],
				description: 'Filter by event status',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: { resource: ['event'], operation: ['getMany'] },
				},
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 20,
				description: 'Max number of results to return',
			},

			// Event: Submit
			{
				displayName: 'Submission Title',
				name: 'title',
				type: 'string',
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['submit'] },
				},
				default: '',
				placeholder: 'Pizza from Dominos',
				description: 'Your pick/submission',
			},

			// Event: Vote
			{
				displayName: 'Submission IDs',
				name: 'submissionIds',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['vote'] },
				},
				default: [],
				description: 'IDs of submissions to vote for',
			},

			// ==================== GROUP OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: { resource: ['group'] },
				},
				options: [
					{ name: 'Get', value: 'get', description: 'Get group details', action: 'Get a group' },
					{ name: 'Get Many', value: 'getMany', description: 'List groups', action: 'Get many groups' },
					{ name: 'Get Topics', value: 'getTopics', description: 'List topics in group', action: 'Get group topics' },
					{ name: 'Get Members', value: 'getMembers', description: 'List group members', action: 'Get group members' },
				],
				default: 'getMany',
			},

			// Group: Get / Topics / Members
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				required: true,
				displayOptions: {
					show: { resource: ['group'], operation: ['get', 'getTopics', 'getMembers'] },
				},
				default: '',
				description: 'The group ID',
			},

			// ==================== KARMA OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: { resource: ['karma'] },
				},
				options: [
					{ name: 'Get', value: 'get', description: 'Get karma stats', action: 'Get karma' },
				],
				default: 'get',
			},
			{
				displayName: 'Group ID',
				name: 'karmaGroupId',
				type: 'string',
				displayOptions: {
					show: { resource: ['karma'], operation: ['get'] },
				},
				default: '',
				description: 'Filter karma by group (optional)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('pikaramaApi');
		const baseUrl = credentials.baseUrl as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let endpoint = '';
				let method = 'GET';
				let body: Record<string, unknown> = {};
				let qs: Record<string, string> = {};

				// ==================== EVENT ====================
				if (resource === 'event') {
					if (operation === 'create') {
						endpoint = '/api/v1/events';
						method = 'POST';
						const isPoll = this.getNodeParameter('isPoll', i) as boolean;
						body = {
							topicId: this.getNodeParameter('topicId', i) as string,
							name: this.getNodeParameter('name', i) as string,
							isPoll,
						};
						if (isPoll) {
							body.pollOptions = this.getNodeParameter('pollOptions', i) as string[];
						}
					} else if (operation === 'get') {
						const eventId = this.getNodeParameter('eventId', i) as string;
						endpoint = `/api/v1/events/${eventId}`;
					} else if (operation === 'getMany') {
						endpoint = '/api/v1/events';
						const status = this.getNodeParameter('status', i) as string[];
						const limit = this.getNodeParameter('limit', i) as number;
						qs = { status: status.join(','), limit: String(limit) };
					} else if (operation === 'submit') {
						const eventId = this.getNodeParameter('eventId', i) as string;
						endpoint = `/api/v1/events/${eventId}/submit`;
						method = 'POST';
						body = { title: this.getNodeParameter('title', i) as string };
					} else if (operation === 'vote') {
						const eventId = this.getNodeParameter('eventId', i) as string;
						endpoint = `/api/v1/events/${eventId}/vote`;
						method = 'POST';
						body = { submissionIds: this.getNodeParameter('submissionIds', i) as string[] };
					} else if (operation === 'advance') {
						const eventId = this.getNodeParameter('eventId', i) as string;
						endpoint = `/api/v1/events/${eventId}/advance`;
						method = 'POST';
					} else if (operation === 'cancel') {
						const eventId = this.getNodeParameter('eventId', i) as string;
						endpoint = `/api/v1/events/${eventId}/cancel`;
						method = 'POST';
					}
				}

				// ==================== GROUP ====================
				if (resource === 'group') {
					if (operation === 'get') {
						const groupId = this.getNodeParameter('groupId', i) as string;
						endpoint = `/api/v1/groups/${groupId}`;
					} else if (operation === 'getMany') {
						endpoint = '/api/v1/groups';
					} else if (operation === 'getTopics') {
						const groupId = this.getNodeParameter('groupId', i) as string;
						endpoint = `/api/v1/groups/${groupId}/topics`;
					} else if (operation === 'getMembers') {
						const groupId = this.getNodeParameter('groupId', i) as string;
						endpoint = `/api/v1/groups/${groupId}/members`;
					}
				}

				// ==================== KARMA ====================
				if (resource === 'karma') {
					if (operation === 'get') {
						endpoint = '/api/v1/karma';
						const groupId = this.getNodeParameter('karmaGroupId', i, '') as string;
						if (groupId) {
							qs = { groupId };
						}
					}
				}

				// Make request
				const url = new URL(endpoint, baseUrl);
				Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));

				const options: RequestInit = {
					method,
					headers: {
						'Authorization': `Bearer ${credentials.apiToken}`,
						'Content-Type': 'application/json',
					},
				};

				if (method === 'POST' && Object.keys(body).length > 0) {
					options.body = JSON.stringify(body);
				}

				const response = await fetch(url.toString(), options);
				const data = await response.json() as Record<string, unknown>;

				if (!response.ok) {
					const errorMsg = (data.message as string) || (data.error as string) || 'Unknown error';
					throw new NodeOperationError(
						this.getNode(),
						`Pikarama API error: ${errorMsg}`,
						{ itemIndex: i }
					);
				}

				returnData.push({ json: data as IDataObject });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
