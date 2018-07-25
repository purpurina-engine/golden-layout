
export default class ConfigurationError extends Error {

    name: string;
    message: string;
    node: any;

    constructor(message: string, node?: any) {
        super();

        this.name = 'Configuration Error';
        this.message = message;
        this.node = node;
    }
}
