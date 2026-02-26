import { IHookFunctions, ILoadOptionsFunctions, INodePropertyOptions, IWebhookFunctions, IWebhookResponseData, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class PikaramaTrigger implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    webhookMethods: {
        default: {
            checkExists(this: IHookFunctions): Promise<boolean>;
            create(this: IHookFunctions): Promise<boolean>;
            delete(this: IHookFunctions): Promise<boolean>;
        };
    };
    webhook(this: IWebhookFunctions): Promise<IWebhookResponseData>;
}
