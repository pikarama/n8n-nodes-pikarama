import { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodePropertyOptions, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class Pikarama implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getTopics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getGroupMembers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getSubmissions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
