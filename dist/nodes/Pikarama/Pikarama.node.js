"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pikarama = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class Pikarama {
    constructor() {
        this.description = {
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
                        { name: 'User', value: 'user' },
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
                // ==================== USER OPERATIONS ====================
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: { resource: ['user'] },
                    },
                    options: [
                        { name: 'Get Current', value: 'getCurrent', description: 'Get current user info (verify API token ownership)', action: 'Get current user' },
                    ],
                    default: 'getCurrent',
                },
            ],
        };
        this.methods = {
            loadOptions: {
                async getGroups() {
                    const credentials = await this.getCredentials('pikaramaApi');
                    const baseUrl = credentials.baseUrl;
                    const response = await fetch(`${baseUrl}/api/v1/groups`, {
                        headers: {
                            'Authorization': `Bearer ${credentials.apiToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        return [];
                    }
                    const data = await response.json();
                    return (data.groups || []).map((g) => ({
                        name: g.name,
                        value: g.id,
                    }));
                },
                async getTopics() {
                    const credentials = await this.getCredentials('pikaramaApi');
                    const baseUrl = credentials.baseUrl;
                    const groupId = this.getCurrentNodeParameter('groupId');
                    if (!groupId) {
                        return [];
                    }
                    const response = await fetch(`${baseUrl}/api/v1/groups/${groupId}/topics`, {
                        headers: {
                            'Authorization': `Bearer ${credentials.apiToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        return [];
                    }
                    const data = await response.json();
                    return (data.topics || []).map((t) => ({
                        name: t.name,
                        value: t.id,
                    }));
                },
                async getEvents() {
                    const credentials = await this.getCredentials('pikaramaApi');
                    const baseUrl = credentials.baseUrl;
                    const response = await fetch(`${baseUrl}/api/v1/events?status=submitting,voting&limit=50`, {
                        headers: {
                            'Authorization': `Bearer ${credentials.apiToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        return [];
                    }
                    const data = await response.json();
                    return (data.events || []).map((e) => ({
                        name: `${e.name} (${e.status})`,
                        value: e.id,
                    }));
                },
                async getGroupMembers() {
                    const credentials = await this.getCredentials('pikaramaApi');
                    const baseUrl = credentials.baseUrl;
                    const groupId = this.getCurrentNodeParameter('groupId');
                    if (!groupId) {
                        return [];
                    }
                    const response = await fetch(`${baseUrl}/api/v1/groups/${groupId}/members`, {
                        headers: {
                            'Authorization': `Bearer ${credentials.apiToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        return [];
                    }
                    const data = await response.json();
                    return (data.members || []).map((m) => ({
                        name: m.name || m.userId,
                        value: m.userId,
                    }));
                },
                async getSubmissions() {
                    const credentials = await this.getCredentials('pikaramaApi');
                    const baseUrl = credentials.baseUrl;
                    const eventId = this.getCurrentNodeParameter('eventId');
                    if (!eventId) {
                        return [];
                    }
                    const response = await fetch(`${baseUrl}/api/v1/events/${eventId}`, {
                        headers: {
                            'Authorization': `Bearer ${credentials.apiToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        return [];
                    }
                    const data = await response.json();
                    return (data.submissions || []).map((s) => ({
                        name: `${s.title} (by ${s.authorName})`,
                        value: s.id,
                    }));
                },
            },
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('pikaramaApi');
        const baseUrl = credentials.baseUrl;
        for (let i = 0; i < items.length; i++) {
            try {
                const resource = this.getNodeParameter('resource', i);
                const operation = this.getNodeParameter('operation', i);
                let endpoint = '';
                let method = 'GET';
                let body = {};
                let qs = {};
                // ==================== EVENT ====================
                if (resource === 'event') {
                    if (operation === 'create') {
                        endpoint = '/api/v1/events';
                        method = 'POST';
                        const isPoll = this.getNodeParameter('isPoll', i);
                        const attendees = this.getNodeParameter('attendees', i, []);
                        body = {
                            topicId: this.getNodeParameter('topicId', i),
                            name: this.getNodeParameter('name', i),
                            isPoll,
                        };
                        if (attendees.length > 0) {
                            body.attendees = attendees;
                        }
                        if (isPoll) {
                            body.pollOptions = this.getNodeParameter('pollOptions', i);
                        }
                    }
                    else if (operation === 'get') {
                        const eventId = this.getNodeParameter('eventId', i);
                        endpoint = `/api/v1/events/${eventId}`;
                    }
                    else if (operation === 'getMany') {
                        endpoint = '/api/v1/events';
                        const status = this.getNodeParameter('status', i);
                        const limit = this.getNodeParameter('limit', i);
                        qs = { status: status.join(','), limit: String(limit) };
                    }
                    else if (operation === 'submit') {
                        const eventId = this.getNodeParameter('eventId', i);
                        const titles = this.getNodeParameter('titles', i);
                        // Submit each title separately and collect results
                        const submissions = [];
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
                            const submitData = await submitResponse.json();
                            if (!submitResponse.ok) {
                                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Submit failed for "${title}": ${submitData.message || 'Unknown error'}`, { itemIndex: i });
                            }
                            submissions.push(submitData);
                        }
                        returnData.push({ json: { submissions } });
                        continue; // Skip normal request flow
                    }
                    else if (operation === 'vote') {
                        const eventId = this.getNodeParameter('eventId', i);
                        endpoint = `/api/v1/events/${eventId}/vote`;
                        method = 'POST';
                        body = { submissionIds: this.getNodeParameter('submissionIds', i) };
                    }
                    else if (operation === 'advance') {
                        const eventId = this.getNodeParameter('eventId', i);
                        endpoint = `/api/v1/events/${eventId}/advance`;
                        method = 'POST';
                    }
                    else if (operation === 'cancel') {
                        const eventId = this.getNodeParameter('eventId', i);
                        endpoint = `/api/v1/events/${eventId}/cancel`;
                        method = 'POST';
                    }
                }
                // ==================== GROUP ====================
                if (resource === 'group') {
                    if (operation === 'get') {
                        const groupId = this.getNodeParameter('groupIdSelect', i);
                        endpoint = `/api/v1/groups/${groupId}`;
                    }
                    else if (operation === 'getMany') {
                        endpoint = '/api/v1/groups';
                    }
                    else if (operation === 'getTopics') {
                        const groupId = this.getNodeParameter('groupIdSelect', i);
                        endpoint = `/api/v1/groups/${groupId}/topics`;
                    }
                    else if (operation === 'getMembers') {
                        const groupId = this.getNodeParameter('groupIdSelect', i);
                        endpoint = `/api/v1/groups/${groupId}/members`;
                    }
                }
                // ==================== KARMA ====================
                if (resource === 'karma') {
                    if (operation === 'get') {
                        endpoint = '/api/v1/karma';
                        const groupId = this.getNodeParameter('karmaGroupId', i, '');
                        if (groupId) {
                            qs = { groupId };
                        }
                    }
                }
                // ==================== USER ====================
                if (resource === 'user') {
                    if (operation === 'getCurrent') {
                        endpoint = '/api/v1/me';
                    }
                }
                // Make request
                const url = new URL(endpoint, baseUrl);
                Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
                const options = {
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
                const data = await response.json();
                if (!response.ok) {
                    const errorMsg = data.message || data.error || 'Unknown error';
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Pikarama API error: ${errorMsg}`, { itemIndex: i });
                }
                returnData.push({ json: data });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.Pikarama = Pikarama;
