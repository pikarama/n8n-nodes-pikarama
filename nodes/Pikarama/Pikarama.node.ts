import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
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

			// Event: Create - Group selector (for filtering topics)
			{
				displayName: 'Group',
				name: 'groupId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['create'] },
				},
				default: '',
				description: 'Select the group containing the topic',
			},
			// Event: Create - Topic selector (depends on group)
			{
				displayName: 'Topic',
				name: 'topicId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTopics',
					loadOptionsDependsOn: ['groupId'],
				},
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['create'] },
				},
				default: '',
				description: 'The topic for this event',
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
			// Participants selector (depends on group)
			{
				displayName: 'Participants',
				name: 'attendees',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getGroupMembers',
					loadOptionsDependsOn: ['groupId'],
				},
				displayOptions: {
					show: { resource: ['event'], operation: ['create'] },
				},
				default: [],
				description: 'Select participants (leave empty for all group members)',
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

			// Event: Get - use dropdown
			{
				displayName: 'Event',
				name: 'eventId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEvents',
				},
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['get', 'submit', 'vote', 'advance', 'cancel'] },
				},
				default: '',
				description: 'Select the event',
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
				displayName: 'Submission Titles',
				name: 'titles',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['submit'] },
				},
				default: [],
				placeholder: 'Add submission',
				description: 'Your picks/submissions (up to 3)',
			},

			// Event: Vote - Submissions selector
			{
				displayName: 'Submissions',
				name: 'submissionIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getSubmissions',
					loadOptionsDependsOn: ['eventId'],
				},
				required: true,
				displayOptions: {
					show: { resource: ['event'], operation: ['vote'] },
				},
				default: [],
				description: 'Select submissions to vote for',
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

			// Group: Get / Topics / Members - use dropdown
			{
				displayName: 'Group',
				name: 'groupIdSelect',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				required: true,
				displayOptions: {
					show: { resource: ['group'], operation: ['get', 'getTopics', 'getMembers'] },
				},
				default: '',
				description: 'Select the group',
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
				displayName: 'Group',
				name: 'karmaGroupId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				displayOptions: {
					show: { resource: ['karma'], operation: ['get'] },
				},
				default: '',
				description: 'Filter karma by group (optional - leave empty for all)',
			},
		],
	};

	methods = {
		loadOptions: {
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('pikaramaApi');
				const baseUrl = credentials.baseUrl as string;

				const response = await fetch(`${baseUrl}/api/v1/groups`, {
					headers: {
						'Authorization': `Bearer ${credentials.apiToken}`,
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					return [{ name: 'Error loading groups', value: '' }];
				}

				const data = await response.json() as { groups: Array<{ id: string; name: string }> };
				return (data.groups || []).map((g) => ({
					name: g.name,
					value: g.id,
				}));
			},

			async getTopics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('pikaramaApi');
				const baseUrl = credentials.baseUrl as string;
				const groupId = this.getCurrentNodeParameter('groupId') as string;

				if (!groupId) {
					return [{ name: 'Select a group first', value: '' }];
				}

				const response = await fetch(`${baseUrl}/api/v1/groups/${groupId}/topics`, {
					headers: {
						'Authorization': `Bearer ${credentials.apiToken}`,
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					return [{ name: 'Error loading topics', value: '' }];
				}

				const data = await response.json() as { topics: Array<{ id: string; name: string }> };
				return (data.topics || []).map((t) => ({
					name: t.name,
					value: t.id,
				}));
			},

			async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('pikaramaApi');
				const baseUrl = credentials.baseUrl as string;

				const response = await fetch(`${baseUrl}/api/v1/events?status=submitting,voting&limit=50`, {
					headers: {
						'Authorization': `Bearer ${credentials.apiToken}`,
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					return [{ name: 'Error loading events', value: '' }];
				}

				const data = await response.json() as { events: Array<{ id: string; name: string; status: string }> };
				return (data.events || []).map((e) => ({
					name: `${e.name} (${e.status})`,
					value: e.id,
				}));
			},

			async getGroupMembers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('pikaramaApi');
				const baseUrl = credentials.baseUrl as string;
				const groupId = this.getCurrentNodeParameter('groupId') as string;

				if (!groupId) {
					return [{ name: 'Select a group first', value: '' }];
				}

				const response = await fetch(`${baseUrl}/api/v1/groups/${groupId}/members`, {
					headers: {
						'Authorization': `Bearer ${credentials.apiToken}`,
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					return [{ name: 'Error loading members', value: '' }];
				}

				const data = await response.json() as { members: Array<{ userId: string; name: string }> };
				return (data.members || []).map((m) => ({
					name: m.name || m.userId,
					value: m.userId,
				}));
			},

			async getSubmissions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('pikaramaApi');
				const baseUrl = credentials.baseUrl as string;
				const eventId = this.getCurrentNodeParameter('eventId') as string;

				if (!eventId) {
					return [{ name: 'Select an event first', value: '' }];
				}

				const response = await fetch(`${baseUrl}/api/v1/events/${eventId}`, {
					headers: {
						'Authorization': `Bearer ${credentials.apiToken}`,
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					return [{ name: 'Error loading submissions', value: '' }];
				}

				const data = await response.json() as { submissions: Array<{ id: string; title: string; authorName: string }> };
				return (data.submissions || []).map((s) => ({
					name: `${s.title} (by ${s.authorName})`,
					value: s.id,
				}));
			},
		},
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
						const attendees = this.getNodeParameter('attendees', i, []) as string[];
						body = {
							topicId: this.getNodeParameter('topicId', i) as string,
							name: this.getNodeParameter('name', i) as string,
							isPoll,
						};
						if (attendees.length > 0) {
							body.attendees = attendees;
						}
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
						const titles = this.getNodeParameter('titles', i) as string[];
						
						// Submit each title separately and collect results
						const submissions: Record<string, unknown>[] = [];
						for (const title of titles) {
							const submitUrl = new URL(`/api/v1/events/${eventId}/submit`, baseUrl);
							const submitResponse = await fetch(submitUrl.toString(), {
								method: 'POST',
								headers: {
									'Authorization': `Bearer ${credentials.apiToken}`,
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({ title }),
							});
							const submitData = await submitResponse.json() as Record<string, unknown>;
							if (!submitResponse.ok) {
								throw new NodeOperationError(
									this.getNode(),
									`Submit failed for "${title}": ${(submitData.message as string) || 'Unknown error'}`,
									{ itemIndex: i }
								);
							}
							submissions.push(submitData);
						}
						returnData.push({ json: { submissions } as IDataObject });
						continue; // Skip normal request flow
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
						const groupId = this.getNodeParameter('groupIdSelect', i) as string;
						endpoint = `/api/v1/groups/${groupId}`;
					} else if (operation === 'getMany') {
						endpoint = '/api/v1/groups';
					} else if (operation === 'getTopics') {
						const groupId = this.getNodeParameter('groupIdSelect', i) as string;
						endpoint = `/api/v1/groups/${groupId}/topics`;
					} else if (operation === 'getMembers') {
						const groupId = this.getNodeParameter('groupIdSelect', i) as string;
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
